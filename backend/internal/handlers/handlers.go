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
	}
}

func (h *Handlers) SetupRoutes(r *gin.Engine, botToken string) {
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
		}
	}
}
