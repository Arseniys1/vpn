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
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/config"
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

	// Initialize RabbitMQ
	q, err := queue.New(cfg.RabbitMQ.URL, cfg.RabbitMQ.Exchange)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to RabbitMQ")
	}
	defer q.Close()

	// Initialize WebSocket service
	wsService := services.NewWebSocketService()

	// Start WebSocket service in a separate goroutine
	go wsService.Run()

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// WebSocket endpoint
	r.GET("/ws", wsService.HandleWebSocket)

	// Start consuming WebSocket notification tasks
	go func() {
		err := q.ConsumeTasks("websocket_notifications", func(task queue.Task) error {
			log.Info().
				Str("type", task.Type).
				Str("user_id", task.UserID.String()).
				Msg("Received WebSocket notification task")

			// Convert task to WebSocket message
			var userID *string
			if id, exists := task.Data["user_id"]; exists {
				if strID, ok := id.(string); ok {
					userID = &strID
				}
			}

			// Create WebSocket message
			wsMessage := services.WebSocketMessage{
				Type:      task.Type,
				Timestamp: time.Now(),
				Data:      task.Data,
			}

			// Set user ID if specified
			if userID != nil {
				if uid, err := parseUUID(*userID); err == nil {
					wsMessage.UserID = &uid
				}
			}

			// Broadcast message
			wsService.BroadcastMessage(wsMessage)
			return nil
		})
		if err != nil {
			log.Error().Err(err).Msg("Failed to consume WebSocket notification tasks")
		}
	}()

	// Create HTTP server for WebSocket endpoint
	srv := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.WebsocketPort),
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
			Msg("Starting WebSocket server")

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Failed to start WebSocket server")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down WebSocket server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("WebSocket server forced to shutdown")
	}

	log.Info().Msg("WebSocket server exited")
}

// parseUUID safely parses a string to UUID
func parseUUID(s string) (uuid.UUID, error) {
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}
