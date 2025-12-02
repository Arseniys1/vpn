package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/middleware"
	"xray-vpn-connect/internal/services"
)

type Handlers struct {
	UserHandler         *UserHandler
	SubscriptionHandler *SubscriptionHandler
	PlanService         *services.PlanService
	ServerHandler       *ServerHandler
	ConnectionHandler   *ConnectionHandler
	AdminHandler        *AdminHandler
	SupportHandler      *SupportHandler
	AuthHandler         *AuthHandler
}

func NewHandlers(
	userService *services.UserService,
	paymentService *services.PaymentService,
	subscriptionService *services.SubscriptionService,
	planService *services.PlanService,
	connectionService *services.ConnectionService,
	db *database.DB,
) *Handlers {
	return &Handlers{
		UserHandler:         NewUserHandler(userService, paymentService, db),
		SubscriptionHandler: NewSubscriptionHandler(subscriptionService, planService, userService),
		PlanService:         planService,
		ServerHandler:       NewServerHandler(db, userService),
		ConnectionHandler:   NewConnectionHandler(connectionService, userService),
		AdminHandler:        NewAdminHandler(db),
		SupportHandler:      NewSupportHandler(db, userService),
		AuthHandler:         NewAuthHandler(db),
	}
}

func (h *Handlers) SetupRoutes(r *gin.Engine, cfg *config.Config, db *database.DB) {
	// Add database to context for middleware access
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	})

	h.UserHandler.SetConfig(cfg)

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().Unix()})
	})

	// Readiness check
	r.GET("/ready", func(c *gin.Context) {
		// Check database connection
		sqlDB, err := db.DB.DB()
		if err != nil || sqlDB.Ping() != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// Pass config to AuthHandler
	h.AuthHandler.SetConfig(cfg)

	// Telegram webhook endpoint (public)
	r.POST("/webhook/telegram", h.AuthHandler.TelegramWebhook)

	// Telegram Stars payment webhook endpoint (public)
	r.POST("/webhook/stars-payment", h.UserHandler.ProcessStarsPaymentWebhook)

	// Public endpoint to get bot information
	r.GET("/bot-info", func(c *gin.Context) {
		botUsername := cfg.Telegram.BotUsername
		if botUsername == "" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Bot username not configured"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"bot_username": botUsername,
			"bot_link":     "https://t.me/" + botUsername,
		})
	})

	// Authentication endpoints
	auth := r.Group("/auth")
	{
		// Browser authentication - redirect to Telegram
		auth.GET("/browser", h.AuthHandler.BrowserAuthRedirect)

		// Validate browser token
		auth.GET("/validate", h.AuthHandler.ValidateBrowserToken)

		// Check authentication status
		auth.GET("/status", h.AuthHandler.CheckAuthStatus)

		// Telegram OAuth endpoint for browser access
		auth.GET("/telegram", func(c *gin.Context) {
			// In a real implementation, this would redirect to Telegram OAuth
			// For now, we'll return instructions
			c.JSON(http.StatusOK, gin.H{
				"message":      "To authenticate via Telegram, open this app in Telegram WebApp",
				"instructions": "This endpoint would normally redirect to Telegram OAuth flow",
			})
		})
	}

	api := r.Group("/api/v1")
	// Apply rate limiting to all API routes
	api.Use(middleware.RateLimit(10, 20)) // 10 requests per second, burst of 20
	// Apply access detection middleware
	api.Use(middleware.DetectAccessMethod())
	api.Use(middleware.HybridAuth(cfg.Telegram.BotToken))
	{
		// Public routes
		api.GET("/servers", h.ServerHandler.GetServers)

		// Protected routes (require authentication)
		protected := api.Group("")
		protected.Use(middleware.HybridAuth(cfg.Telegram.BotToken))
		{
			// User routes
			userRoutes := protected.Group("/users")
			{
				userRoutes.GET("/me", h.UserHandler.Me)
				userRoutes.POST("/topup", h.UserHandler.TopUp)
				userRoutes.POST("/initiate-stars-payment", h.UserHandler.InitiateStarsPayment)
				userRoutes.GET("/referral-stats", h.UserHandler.GetReferralStats)
			}

			// Subscription routes
			subscriptionRoutes := protected.Group("/subscriptions")
			{
				subscriptionRoutes.GET("/plans", h.SubscriptionHandler.GetPlans)
				subscriptionRoutes.POST("/purchase", h.SubscriptionHandler.PurchasePlan)
				subscriptionRoutes.GET("/me", h.SubscriptionHandler.GetMySubscription)
			}

			// Connection routes
			connectionRoutes := protected.Group("/connections")
			{
				connectionRoutes.GET("", h.ConnectionHandler.GetMyConnections)
				connectionRoutes.POST("", h.ConnectionHandler.CreateConnection)
				connectionRoutes.DELETE("/:id", h.ConnectionHandler.DeleteConnection)
			}

			// Support routes
			supportRoutes := protected.Group("/support")
			{
				supportRoutes.POST("/tickets", h.SupportHandler.CreateTicket)
				supportRoutes.GET("/tickets", h.SupportHandler.GetMyTickets)
				supportRoutes.GET("/tickets/:id", h.SupportHandler.GetTicket)
				supportRoutes.POST("/tickets/:id/messages", h.SupportHandler.AddMessage)
			}

			// Admin routes (require admin role)
			adminRoutes := protected.Group("/admin")
			adminRoutes.Use(middleware.RequireAdmin(db))
			{
				// Stats
				adminRoutes.GET("/stats", h.AdminHandler.GetStats)

				// Server management
				adminRoutes.GET("/servers", h.AdminHandler.GetAllServers)
				adminRoutes.POST("/servers", h.AdminHandler.CreateServer)
				adminRoutes.PUT("/servers/:id", h.AdminHandler.UpdateServer)
				adminRoutes.DELETE("/servers/:id", h.AdminHandler.DeleteServer)
				adminRoutes.GET("/servers/:id/users", h.AdminHandler.GetServerUsers)

				// Xray panel management
				adminRoutes.GET("/xray-panels", h.AdminHandler.GetAllXrayPanels)

				// User management
				adminRoutes.GET("/users", h.AdminHandler.GetAllUsers)
				adminRoutes.PUT("/users/:id", h.AdminHandler.UpdateUser)

				// Plan management
				adminRoutes.GET("/plans", h.AdminHandler.GetAllPlans)
				adminRoutes.POST("/plans", h.AdminHandler.CreatePlan)
				adminRoutes.PUT("/plans/:id", h.AdminHandler.UpdatePlan)
				adminRoutes.DELETE("/plans/:id", h.AdminHandler.DeletePlan)

				// Ticket management
				adminRoutes.GET("/tickets", h.AdminHandler.GetAllTickets)
				adminRoutes.POST("/tickets/:id/reply", h.AdminHandler.ReplyToTicket)
			}
		}
	}
}
