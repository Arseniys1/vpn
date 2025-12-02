package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type AuthHandler struct {
	db     *database.DB
	config *config.Config
}

func NewAuthHandler(db *database.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

// SetConfig sets the configuration for the AuthHandler
func (h *AuthHandler) SetConfig(cfg *config.Config) {
	h.config = cfg
}

// BrowserAuthRedirect redirects browser users to Telegram OAuth
func (h *AuthHandler) BrowserAuthRedirect(c *gin.Context) {
	// Generate a unique state parameter for CSRF protection
	state := generateRandomString(32)

	// Store state in database with expiration (5 minutes)
	authSession := models.AuthSession{
		ID:        uuid.New(),
		State:     state,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	if err := h.db.DB.Create(&authSession).Error; err != nil {
		log.Error().Err(err).Msg("Failed to create auth session")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initiate authentication"})
		return
	}

	// Get bot username from config
	botUsername := h.config.Telegram.BotUsername
	if botUsername == "" {
		log.Error().Msg("TELEGRAM_BOT_USERNAME not set in config")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bot configuration error"})
		return
	}

	// Construct Telegram bot URL with state parameter
	telegramURL := fmt.Sprintf("tg://resolve?domain=%s&start=%s", botUsername, state)

	c.JSON(http.StatusOK, gin.H{
		"url": telegramURL,
	})
}

// TelegramOAuthCallback handles the callback from Telegram OAuth
func (h *AuthHandler) TelegramOAuthCallback(c *gin.Context) {
	// This endpoint would be called by Telegram webhook when user interacts with bot
	// For now, we'll handle it through the /start command in the bot
}

// ValidateBrowserToken validates a browser authentication token
func (h *AuthHandler) ValidateBrowserToken(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing token"})
		return
	}

	// Look up token in database
	var session models.BrowserSession
	if err := h.db.DB.Where("token = ? AND expires_at > ?", token, time.Now()).First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		log.Error().Err(err).Msg("Database error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"user_id": session.UserID,
	})
}

// CheckAuthStatus checks if the authentication process is complete for a given state
func (h *AuthHandler) CheckAuthStatus(c *gin.Context) {
	state := c.Query("state")
	if state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing state parameter"})
		return
	}

	// Auth session exists and is not expired, check if there's a browser session associated with it
	var browserSession models.BrowserSession
	if err := h.db.DB.Where("auth_state = ?", state).First(&browserSession).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// No browser session created yet, still pending
			c.JSON(http.StatusOK, gin.H{"status": "pending"})
			return
		}
		log.Error().Err(err).Msg("Database error")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// If we found a browser session associated with this auth state, authentication is complete
	c.JSON(http.StatusOK, gin.H{
		"status":  "complete",
		"token":   browserSession.Token,
		"user_id": browserSession.UserID,
	})
}

func (h *AuthHandler) getOrCreateUser(telegramID int64, firstName, lastName, username string) (*models.User, error) {
	var user models.User

	// Try to find existing user
	if err := h.db.DB.Where("telegram_id = ?", telegramID).First(&user).Error; err == nil {
		// User exists, update info if needed
		needsUpdate := false

		if user.FirstName != firstName {
			user.FirstName = firstName
			needsUpdate = true
		}

		if (user.LastName == nil && lastName != "") || (user.LastName != nil && *user.LastName != lastName) {
			if lastName != "" {
				user.LastName = &lastName
			} else {
				user.LastName = nil
			}
			needsUpdate = true
		}

		if (user.Username == nil && username != "") || (user.Username != nil && *user.Username != username) {
			if username != "" {
				user.Username = &username
			} else {
				user.Username = nil
			}
			needsUpdate = true
		}

		if needsUpdate {
			if err := h.db.DB.Save(&user).Error; err != nil {
				return nil, fmt.Errorf("failed to update user: %w", err)
			}
		}

		return &user, nil
	}

	// Create new user
	user = models.User{
		ID:         uuid.New(),
		TelegramID: telegramID,
		FirstName:  firstName,
		Balance:    0,
		IsActive:   true,
		IsAdmin:    false,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// Set optional fields
	if lastName != "" {
		user.LastName = &lastName
	}

	if username != "" {
		user.Username = &username
	}

	// Generate referral code
	user.ReferralCode = generateReferralCode()

	if err := h.db.DB.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// generateReferralCode generates a unique referral code
func generateReferralCode() string {
	// Generate a random 8-character alphanumeric string
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based string
		return fmt.Sprintf("%x", time.Now().UnixNano())[:8]
	}
	return fmt.Sprintf("%x", bytes)
}

// generateRandomString generates a random string of given length
func generateRandomString(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based string
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length]
}

// sendTelegramMessage sends a message to a Telegram chat
func SendTelegramMessage(db *database.DB, cfg *config.Config, chatID int64, text string) {
	// Get bot token from config
	botToken := cfg.Telegram.BotToken
	if botToken == "" {
		log.Error().Msg("TELEGRAM_BOT_TOKEN not set in config")
		return
	}

	// Telegram API endpoint for sending messages
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	// Prepare the request payload
	payload := map[string]interface{}{
		"chat_id": chatID,
		"text":    text,
	}

	// Convert payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal payload")
		return
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Error().Err(err).Msg("Failed to create request")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to send request")
		return
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		log.Error().Int("status_code", resp.StatusCode).Msg("Telegram API returned non-OK status")
	}
}
