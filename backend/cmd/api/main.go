package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/handlers"
	"xray-vpn-connect/internal/middleware"
	"xray-vpn-connect/internal/queue"
	"xray-vpn-connect/internal/services"
)

func main() {
	// Setup logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("APP_ENV") == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load config")
	}

	// Set Gin mode
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := database.New(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	// Run migrations
	if err := db.AutoMigrate(); err != nil {
		log.Fatal().Err(err).Msg("Failed to run migrations")
	}

	// Seed database
	if cfg.App.Env == "development" {
		if err := db.Seed(); err != nil {
			log.Warn().Err(err).Msg("Failed to seed database")
		}
	}

	// Initialize RabbitMQ
	q, err := queue.New(cfg.RabbitMQ.URL, cfg.RabbitMQ.Exchange)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to RabbitMQ")
	}
	defer q.Close()

	// Initialize Telegram service and set webhook
	if cfg.Telegram.BotToken != "" && cfg.Telegram.WebhookURL != "" {
		telegramService := services.NewTelegramService(cfg.Telegram.BotToken)

		// Set webhook
		if err := telegramService.SetWebhook(cfg.Telegram.WebhookURL); err != nil {
			log.Warn().Err(err).Msg("Failed to set Telegram webhook")
		} else {
			log.Info().Str("webhook_url", cfg.Telegram.WebhookURL).Msg("Telegram webhook set successfully")
		}
	}

	// Initialize services
	userService := services.NewUserService(db)
	subscriptionService := services.NewSubscriptionService(db)
	planService := services.NewPlanService(db)
	connectionService := services.NewConnectionService(db, q)

	// Initialize handlers
	h := handlers.NewHandlers(userService, subscriptionService, planService, connectionService, db)

	// Setup router
	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())

	// Setup routes
	h.SetupRoutes(r, cfg, db)

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Info().
			Str("address", srv.Addr).
			Str("env", cfg.App.Env).
			Msg("Starting HTTP server")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited")
}
