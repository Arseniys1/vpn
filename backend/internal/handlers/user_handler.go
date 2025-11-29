package handlers

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/middleware"
	"xray-vpn-connect/internal/models"
	"xray-vpn-connect/internal/services"
)

type UserHandler struct {
	userService *services.UserService
	db          *database.DB
}

func NewUserHandler(userService *services.UserService, db *database.DB) *UserHandler {
	return &UserHandler{
		userService: userService,
		db:          db,
	}
}

type MeResponse struct {
	ID              uuid.UUID `json:"id"`
	TelegramID      int64     `json:"telegram_id"`
	Username        *string   `json:"username"`
	FirstName       string    `json:"first_name"`
	LastName        *string   `json:"last_name"`
	Balance         int64     `json:"balance"`
	ReferralCode    string    `json:"referral_code"`
	HasSubscription bool      `json:"has_subscription"`
	IsAdmin         bool      `json:"is_admin"`
}

func (h *UserHandler) Me(c *gin.Context) {
	telegramUserID, exists := c.Get("telegram_user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	telegramUser, _ := c.Get("telegram_user")
	userData := telegramUser.(middleware.TelegramUser)

	user, err := h.userService.GetOrCreateUser(
		telegramUserID.(int64),
		userData.Username,
		userData.FirstName,
		userData.LastName,
		userData.LanguageCode,
	)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get or create user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	// Check subscription status (will be populated by frontend or separate call)
	hasSubscription := false

	c.JSON(http.StatusOK, MeResponse{
		ID:              user.ID,
		TelegramID:      user.TelegramID,
		Username:        user.Username,
		FirstName:       user.FirstName,
		LastName:        user.LastName,
		Balance:         user.Balance,
		ReferralCode:    user.ReferralCode,
		HasSubscription: hasSubscription,
		IsAdmin:         user.IsAdmin,
	})
}

func (h *UserHandler) TopUp(c *gin.Context) {
	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		Amount int64 `json:"amount" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.userService.UpdateBalance(user.ID, req.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update balance"})
		return
	}

	// Get updated user
	user, _ = h.userService.GetUserByTelegramID(telegramUserID.(int64))

	c.JSON(http.StatusOK, gin.H{"new_balance": user.Balance})
}

// GetReferralStats returns referral statistics for the user
func (h *UserHandler) GetReferralStats(c *gin.Context) {
	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Count total referrals
	var totalReferrals int64
	h.db.DB.Model(&models.User{}).Where("referred_by = ?", user.ID).Count(&totalReferrals)

	// Count active referrals (users with active subscriptions)
	var activeReferrals int64
	h.db.DB.Table("users").
		Joins("JOIN subscriptions ON users.id = subscriptions.user_id").
		Where("users.referred_by = ? AND subscriptions.is_active = ?", user.ID, true).
		Count(&activeReferrals)

	// Calculate reward earned (10% of total)
	rewardEarned := activeReferrals * 50

	// Generate referral link using environment variable
	botUsername := os.Getenv("TELEGRAM_BOT_USERNAME")
	if botUsername == "" {
		botUsername = "YourBotUsername" // fallback
	}
	referralLink := fmt.Sprintf("https://t.me/%s?start=%s", botUsername, user.ReferralCode)

	c.JSON(http.StatusOK, gin.H{
		"referral_code":    user.ReferralCode,
		"referral_link":    referralLink,
		"referral_url":     referralLink,
		"total_referrals":  totalReferrals,
		"active_referrals": activeReferrals,
		"reward_earned":    rewardEarned,
	})
}
