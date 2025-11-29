package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/middleware"
	"xray-vpn-connect/internal/services"
)

type Handlers struct {
	UserHandler         *UserHandler
	SubscriptionHandler *SubscriptionHandler
	ServerHandler       *ServerHandler
	ConnectionHandler   *ConnectionHandler
	AdminHandler        *AdminHandler
}

func NewHandlers(
	userService *services.UserService,
	subscriptionService *services.SubscriptionService,
	planService *services.PlanService,
	connectionService *services.ConnectionService,
	db *database.DB,
) *Handlers {
	return &Handlers{
		UserHandler:         NewUserHandler(userService),
		SubscriptionHandler: NewSubscriptionHandler(subscriptionService, planService, userService),
		ServerHandler:       NewServerHandler(db),
		ConnectionHandler:   NewConnectionHandler(connectionService, userService),
		AdminHandler:        NewAdminHandler(db),
	}
}

func (h *Handlers) SetupRoutes(r *gin.Engine, botToken string, db *database.DB) {
	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	{
		// Public routes
		api.GET("/servers", h.ServerHandler.GetServers)

		// Protected routes (require Telegram auth)
		protected := api.Group("")
		protected.Use(middleware.VerifyTelegramWebApp(botToken))
		{
			// User routes
			userRoutes := protected.Group("/users")
			{
				userRoutes.GET("/me", h.UserHandler.Me)
				userRoutes.POST("/topup", h.UserHandler.TopUp)
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
