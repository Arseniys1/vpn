package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/models"
	"xray-vpn-connect/internal/services"
)

type SubscriptionHandler struct {
	subscriptionService *services.SubscriptionService
	planService         *services.PlanService
	userService         *services.UserService
}

func NewSubscriptionHandler(subscriptionService *services.SubscriptionService, planService *services.PlanService, userService *services.UserService) *SubscriptionHandler {
	return &SubscriptionHandler{
		subscriptionService: subscriptionService,
		planService:         planService,
		userService:         userService,
	}
}

func (h *SubscriptionHandler) GetPlans(c *gin.Context) {
	plans, err := h.planService.GetActivePlans()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get plans")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plans"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

func (h *SubscriptionHandler) PurchasePlan(c *gin.Context) {
	// Check authentication method
	authMethod, _ := c.Get("auth_method")

	var user *models.User
	var err error

	switch authMethod {
	case "telegram":
		telegramUserID, _ := c.Get("telegram_user_id")
		user, err = h.userService.GetUserByTelegramID(telegramUserID.(int64))
	case "browser":
		// For browser access, get user by ID
		userID, _ := c.Get("user_id")
		if userIDStr, ok := userID.(string); ok && userIDStr == "browser_user_123" {
			// Mock user for demonstration
			user = &models.User{
				ID:         uuid.New(),
				TelegramID: 123456789,
				FirstName:  "Browser",
				Balance:    1000,
			}
		}
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unknown authentication method"})
		return
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		PlanID uuid.UUID `json:"plan_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	subscription, err := h.subscriptionService.PurchaseSubscription(user.ID, req.PlanID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to purchase subscription")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, subscription)
}

func (h *SubscriptionHandler) GetMySubscription(c *gin.Context) {
	// Check authentication method
	authMethod, _ := c.Get("auth_method")

	var user *models.User
	var err error

	switch authMethod {
	case "telegram":
		telegramUserID, _ := c.Get("telegram_user_id")
		user, err = h.userService.GetUserByTelegramID(telegramUserID.(int64))
	case "browser":
		// For browser access, get user by ID
		userID, _ := c.Get("user_id")
		if userIDStr, ok := userID.(string); ok && userIDStr == "browser_user_123" {
			// Mock user for demonstration
			user = &models.User{
				ID:         uuid.New(),
				TelegramID: 123456789,
				FirstName:  "Browser",
			}
		}
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unknown authentication method"})
		return
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	subscription, err := h.subscriptionService.GetActiveSubscription(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get subscription"})
		return
	}

	if subscription == nil {
		c.JSON(http.StatusOK, gin.H{
			"active": false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"active":     subscription.IsActive,
		"expires_at": subscription.ExpiresAt,
		"plan_name":  subscription.Plan.Name,
	})
}
