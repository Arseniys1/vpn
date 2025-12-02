package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"xray-vpn-connect/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/middleware"
	"xray-vpn-connect/internal/models"
	"xray-vpn-connect/internal/services"
)

type UserHandler struct {
	userService    *services.UserService
	paymentService *services.PaymentService
	db             *database.DB
	config         *config.Config
}

func NewUserHandler(userService *services.UserService, paymentService *services.PaymentService, db *database.DB) *UserHandler {
	return &UserHandler{
		userService:    userService,
		paymentService: paymentService,
		db:             db,
	}
}

func (h *UserHandler) SetConfig(cfg *config.Config) {
	h.config = cfg
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
	// Check authentication method
	authMethod, _ := c.Get("auth_method")

	var user *models.User
	var err error

	switch authMethod {
	case "telegram":
		// Telegram WebApp authentication
		telegramUserID, exists := c.Get("telegram_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		telegramUser, _ := c.Get("telegram_user")
		userData := telegramUser.(middleware.TelegramUser)

		user, err = h.userService.GetOrCreateUser(
			telegramUserID.(int64),
			userData.Username,
			userData.FirstName,
			userData.LastName,
			userData.LanguageCode,
		)
	case "browser":
		// Browser authentication
		// In a real implementation, you would fetch user data based on the authenticated user
		// For now, we'll return a mock user or handle this properly
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		userIdUuid, ok := userID.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user ID"})
			return
		}

		user, err = h.userService.GetUserByID(userIdUuid)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to get user"})
		}
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unknown authentication method"})
		return
	}

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

type TopUpRequest struct {
	Amount int64 `json:"amount" binding:"required,min=1"`
}

type InitiatePaymentResponse struct {
	InvoiceLink string `json:"invoice_link"`
	PaymentID   string `json:"payment_id"`
}

// InitiateStarsPayment creates a payment request for Telegram Stars
func (h *UserHandler) InitiateStarsPayment(c *gin.Context) {
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

		userIdUuid, ok := userID.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user ID"})
			return
		}

		user, err = h.userService.GetUserByID(userIdUuid)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unknown authentication method"})
		return
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req TopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate amount (Telegram Stars payments should be between 1 and 2500)
	if req.Amount < 1 || req.Amount > 2500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be between 1 and 2500 Stars"})
		return
	}

	// Create payment
	payment, err := h.paymentService.CreatePayment(user.ID, user.TelegramID, req.Amount)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create payment")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate payment"})
		return
	}

	c.JSON(http.StatusOK, InitiatePaymentResponse{
		InvoiceLink: payment.InvoiceLink,
		PaymentID:   payment.ID.String(),
	})
}

func (h *UserHandler) TopUp(c *gin.Context) {
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

		userIdUuid, ok := userID.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user ID"})
			return
		}

		user, err = h.userService.GetUserByID(userIdUuid)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unknown authentication method"})
		return
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req TopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.userService.UpdateBalance(user.ID, req.Amount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update balance"})
		return
	}

	// Get updated user
	switch authMethod {
	case "telegram":
		telegramUserID, _ := c.Get("telegram_user_id")
		user, _ = h.userService.GetUserByTelegramID(telegramUserID.(int64))
	case "browser":
		// For browser access, mock the updated user
		user.Balance += req.Amount
	}

	c.JSON(http.StatusOK, gin.H{"new_balance": user.Balance})
}

// ProcessStarsPaymentWebhook handles incoming payment confirmations from Telegram
func (h *UserHandler) ProcessStarsPaymentWebhook(c *gin.Context) {
	// Parse the incoming webhook data
	var update struct {
		UpdateID int `json:"update_id"`
		Message  struct {
			MessageID int `json:"message_id"`
			From      struct {
				ID        int64  `json:"id"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name,omitempty"`
				Username  string `json:"username,omitempty"`
			} `json:"from"`
			Chat struct {
				ID   int64  `json:"id"`
				Type string `json:"type"`
			} `json:"chat"`
			Date int    `json:"date"`
			Text string `json:"text"`
		} `json:"message,omitempty"`
		PreCheckoutQuery struct {
			ID   string `json:"id"`
			From struct {
				ID int64 `json:"id"`
			} `json:"from"`
			Currency         string `json:"currency"`
			TotalAmount      int    `json:"total_amount"`
			InvoicePayload   string `json:"invoice_payload"`
			ShippingOptionID string `json:"shipping_option_id,omitempty"`
			OrderInfo        struct {
				Name            string `json:"name,omitempty"`
				PhoneNumber     string `json:"phone_number,omitempty"`
				Email           string `json:"email,omitempty"`
				ShippingAddress struct {
					CountryCode string `json:"country_code"`
					State       string `json:"state"`
					City        string `json:"city"`
					StreetLine1 string `json:"street_line1"`
					StreetLine2 string `json:"street_line2"`
					PostCode    string `json:"post_code"`
				} `json:"shipping_address,omitempty"`
			} `json:"order_info,omitempty"`
		} `json:"pre_checkout_query,omitempty"`
		SuccessfulPayment struct {
			Currency         string `json:"currency"`
			TotalAmount      int    `json:"total_amount"`
			InvoicePayload   string `json:"invoice_payload"`
			ShippingOptionID string `json:"shipping_option_id,omitempty"`
			OrderInfo        struct {
				Name            string `json:"name,omitempty"`
				PhoneNumber     string `json:"phone_number,omitempty"`
				Email           string `json:"email,omitempty"`
				ShippingAddress struct {
					CountryCode string `json:"country_code"`
					State       string `json:"state"`
					City        string `json:"city"`
					StreetLine1 string `json:"street_line1"`
					StreetLine2 string `json:"street_line2"`
					PostCode    string `json:"post_code"`
				} `json:"shipping_address,omitempty"`
			} `json:"order_info,omitempty"`
			TelegramPaymentChargeID string `json:"telegram_payment_charge_id"`
			ProviderPaymentChargeID string `json:"provider_payment_charge_id"`
		} `json:"successful_payment,omitempty"`
	}

	if err := c.ShouldBindJSON(&update); err != nil {
		log.Error().Err(err).Msg("Failed to parse Telegram payment webhook")
		// Telegram expects a 200 OK response even for errors
		c.JSON(http.StatusOK, gin.H{})
		return
	}

	// Handle pre-checkout query
	if update.PreCheckoutQuery.ID != "" {
		// Approve the pre-checkout query
		botToken := h.config.Telegram.BotToken
		if botToken == "" {
			log.Error().Msg("TELEGRAM_BOT_TOKEN not configured")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

		// Send pre-checkout query approval
		url := fmt.Sprintf("https://api.telegram.org/bot%s/answerPreCheckoutQuery", botToken)
		payload := map[string]interface{}{
			"pre_checkout_query_id": update.PreCheckoutQuery.ID,
			"ok":                    true,
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Error().Err(err).Msg("Failed to send pre-checkout query approval")
		} else {
			resp.Body.Close()
		}

		c.JSON(http.StatusOK, gin.H{})
		return
	}

	// Handle successful payment
	if update.SuccessfulPayment.InvoicePayload != "" {
		// Process the payment
		err := h.paymentService.ProcessPaymentWebhook(
			update.SuccessfulPayment.InvoicePayload,
			update.Message.From.ID,
		)
		if err != nil {
			log.Error().Err(err).Msg("Failed to process payment webhook")
			// We still return 200 OK to Telegram
		}

		// Send confirmation message to user
		if update.Message.Chat.ID != 0 {
			SendTelegramMessage(h.db, h.config, update.Message.Chat.ID,
				fmt.Sprintf("✅ Payment successful! Your balance has been topped up with %d Stars.", update.SuccessfulPayment.TotalAmount))
		}

		c.JSON(http.StatusOK, gin.H{})
		return
	}

	// Default response
	c.JSON(http.StatusOK, gin.H{})
}

// GetReferralStats returns referral statistics for the user
func (h *UserHandler) GetReferralStats(c *gin.Context) {
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
		userIdUuid, ok := userID.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user ID"})
			return
		}

		user, err = h.userService.GetUserByID(userIdUuid)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unknown authentication method"})
		return
	}

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
	botUsername := h.config.Telegram.BotUsername
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
