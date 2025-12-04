package handlers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
	"xray-vpn-connect/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type AuthHandler struct {
	db          *database.DB
	config      *config.Config
	userService *services.UserService
}

func NewAuthHandler(db *database.DB, userService *services.UserService) *AuthHandler {
	return &AuthHandler{
		db:          db,
		userService: userService,
	}
}

// SetConfig sets the configuration for the AuthHandler
func (h *AuthHandler) SetConfig(cfg *config.Config) {
	h.config = cfg
}

// BrowserAuth redirects browser users to Telegram OAuth
func (h *AuthHandler) BrowserAuth(c *gin.Context) {
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
		if errors.Is(err, gorm.ErrRecordNotFound) {
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
		if errors.Is(err, gorm.ErrRecordNotFound) {
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

type TelegramInitData struct {
	QueryID  string
	User     TelegramUser
	AuthDate int64
	Hash     string
}

type TelegramUser struct {
	ID           int64  `json:"id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name,omitempty"`
	Username     string `json:"username,omitempty"`
	LanguageCode string `json:"language_code,omitempty"`
}

type TelegramAuthRequest struct {
	InitData string `json:"initData" binding:"required"`
}

func (h *AuthHandler) TelegramAuth(c *gin.Context) {
	var req TelegramAuthRequest

	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing Telegram init data",
		})
		return
	}

	// Parse init data
	parsedData, err := parseInitData(req.InitData)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse init data")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid init data format",
		})
		return
	}

	// Verify hash
	if !verifyInitData(req.InitData, h.config.Telegram.BotToken, parsedData.Hash) {
		log.Warn().Str("hash", parsedData.Hash).Msg("Invalid init data hash")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid init data signature",
		})
		return
	}

	user, err := h.userService.GetUserByTelegramID(parsedData.User.ID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get user by telegram ID")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
		return
	}

	state := generateRandomString(32)

	// Create browser session token
	token := generateRandomString(64)
	browserSession := models.BrowserSession{
		ID:        uuid.New(),
		Token:     token,
		UserID:    user.ID,
		AuthState: state, // Associate with the auth session
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour), // 30 days
	}

	if err := h.db.DB.Create(&browserSession).Error; err != nil {
		log.Error().Err(err).Msg("Failed to create browser session")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
		return
	}

	// Send welcome notification via WebSocket
	if err := h.userService.SendWelcomeNotification(user.ID); err != nil {
		log.Error().Err(err).Msg("Failed to send welcome notification")
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "complete",
		"token":   browserSession.Token,
		"user_id": browserSession.UserID,
	})
}

func parseInitData(initData string) (*TelegramInitData, error) {
	// First try to URL decode the initData
	decodedData, err := url.QueryUnescape(initData)
	if err != nil {
		// If URL decoding fails, use the original data
		decodedData = initData
	}

	parts := strings.Split(decodedData, "&")
	data := &TelegramInitData{}

	for _, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}

		key := kv[0]
		value, err := url.QueryUnescape(kv[1])
		if err != nil {
			value = kv[1]
		}

		switch key {
		case "query_id":
			data.QueryID = value
		case "user":
			// User is JSON encoded, try to unmarshal directly
			if err := json.Unmarshal([]byte(value), &data.User); err != nil {
				return nil, fmt.Errorf("failed to parse user data: %w", err)
			}
		case "auth_date":
			_, err := fmt.Sscanf(value, "%d", &data.AuthDate)
			if err != nil {
				return nil, fmt.Errorf("failed to parse auth_date: %w", err)
			}
		case "hash":
			data.Hash = value
		}
	}

	return data, nil
}

func verifyInitData(initData, botToken, receivedHash string) bool {
	// First try to URL decode the initData
	decodedData, err := url.QueryUnescape(initData)
	if err != nil {
		decodedData = initData
	}

	// Parse the init data into key-value pairs
	parts := strings.Split(decodedData, "&")
	params := make(map[string]string)

	for _, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}

		key := kv[0]
		value, err := url.QueryUnescape(kv[1])
		if err != nil {
			value = kv[1]
		}
		params[key] = value
	}

	// Remove hash from parameters for verification
	delete(params, "hash")

	// Create sorted array of key=value pairs
	var dataCheckArray []string
	for key, value := range params {
		dataCheckArray = append(dataCheckArray, key+"="+value)
	}
	sort.Strings(dataCheckArray)

	// Join with newline
	dataCheckString := strings.Join(dataCheckArray, "\n")

	// Create secret key: HMAC-SHA256 of "WebAppData" with botToken
	secretKey := hmac.New(sha256.New, []byte("WebAppData"))
	secretKey.Write([]byte(botToken))
	secret := secretKey.Sum(nil)

	// Calculate hash: HMAC-SHA256 of dataCheckString with secret
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(dataCheckString))
	calculatedHash := hex.EncodeToString(h.Sum(nil))

	return calculatedHash == receivedHash
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
