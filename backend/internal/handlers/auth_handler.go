package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type AuthHandler struct {
	db *database.DB
}

func NewAuthHandler(db *database.DB) *AuthHandler {
	return &AuthHandler{db: db}
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

	// Get bot username from environment
	botUsername := os.Getenv("TELEGRAM_BOT_USERNAME")
	if botUsername == "" {
		log.Error().Msg("TELEGRAM_BOT_USERNAME not set")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Bot configuration error"})
		return
	}

	// Construct Telegram bot URL with state parameter
	telegramURL := fmt.Sprintf("https://t.me/%s?start=%s", botUsername, state)

	// Redirect user to Telegram bot
	c.Redirect(http.StatusTemporaryRedirect, telegramURL)
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

// TelegramWebhook handles incoming Telegram bot commands
func (h *AuthHandler) TelegramWebhook(c *gin.Context) {
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
		CallbackQuery struct {
			ID   string `json:"id"`
			From struct {
				ID        int64  `json:"id"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name,omitempty"`
				Username  string `json:"username,omitempty"`
			} `json:"from"`
			Message struct {
				MessageID int `json:"message_id"`
				Chat      struct {
					ID   int64  `json:"id"`
					Type string `json:"type"`
				} `json:"chat"`
			} `json:"message"`
			Data string `json:"data"`
		} `json:"callback_query,omitempty"`
	}

	if err := c.ShouldBindJSON(&update); err != nil {
		log.Error().Err(err).Msg("Failed to parse Telegram webhook")
		// Telegram expects a 200 OK response even for errors
		c.JSON(http.StatusOK, gin.H{})
		return
	}

	// Handle /start command with state parameter
	if update.Message.Text != "" && strings.HasPrefix(update.Message.Text, "/start ") {
		state := strings.TrimPrefix(update.Message.Text, "/start ")

		// Validate the state parameter
		var authSession models.AuthSession
		if err := h.db.DB.Where("state = ? AND expires_at > ?", state, time.Now()).First(&authSession).Error; err != nil {
			log.Warn().Str("state", state).Msg("Invalid or expired authentication session")
			// Send message to user
			sendTelegramMessage(h.db, update.Message.Chat.ID, "❌ Authentication session expired or invalid. Please try again from the browser.")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

		// Get or create user based on Telegram ID
		user, err := h.getOrCreateUser(update.Message.From.ID, update.Message.From.FirstName, update.Message.From.LastName, update.Message.From.Username)
		if err != nil {
			log.Error().Err(err).Int64("telegram_id", update.Message.From.ID).Msg("Failed to get or create user")
			sendTelegramMessage(h.db, update.Message.Chat.ID, "❌ Failed to authenticate. Please try again later.")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

		// Create browser session token
		token := generateRandomString(64)
		browserSession := models.BrowserSession{
			ID:        uuid.New(),
			Token:     token,
			UserID:    user.ID,
			CreatedAt: time.Now(),
			ExpiresAt: time.Now().Add(30 * 24 * time.Hour), // 30 days
		}

		if err := h.db.DB.Create(&browserSession).Error; err != nil {
			log.Error().Err(err).Msg("Failed to create browser session")
			sendTelegramMessage(h.db, update.Message.Chat.ID, "❌ Failed to create session. Please try again later.")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

		// Delete the used auth session to prevent replay attacks
		if err := h.db.DB.Delete(&authSession).Error; err != nil {
			log.Warn().Err(err).Msg("Failed to delete auth session")
		}

		// Send success message to user with link to continue
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000" // default for development
		}

		// Store token in user's cookies by redirecting to frontend with token
		redirectURL := fmt.Sprintf("%s/#/?token=%s", frontendURL, token)

		// Send message to user with inline button
		c.JSON(http.StatusOK, gin.H{
			"method":  "sendMessage",
			"chat_id": update.Message.Chat.ID,
			"text":    "✅ Authentication successful!\n\nClick the button below to continue to the app:",
			"reply_markup": map[string]interface{}{
				"inline_keyboard": [][]map[string]string{
					{
						{"text": "Continue to App", "url": redirectURL},
					},
				},
			},
		})
		return
	}

	// Handle plain /start command (without state)
	if update.Message.Text == "/start" {
		c.JSON(http.StatusOK, gin.H{
			"method":  "sendMessage",
			"chat_id": update.Message.Chat.ID,
			"text":    "Welcome to VPN Connect! To use this service in your browser, please visit our website and click 'Authenticate with Telegram'.",
		})
		return
	}

	// Default response
	c.JSON(http.StatusOK, gin.H{})
}

// getOrCreateUser gets an existing user or creates a new one based on Telegram ID
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
func sendTelegramMessage(db *database.DB, chatID int64, text string) {
	// Get bot token from environment
	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	if botToken == "" {
		log.Error().Msg("TELEGRAM_BOT_TOKEN not set")
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
