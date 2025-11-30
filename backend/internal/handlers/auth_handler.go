package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
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

// generateRandomString generates a random string of given length
func generateRandomString(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based string
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return base64.URLEncoding.EncodeToString(bytes)[:length]
}
