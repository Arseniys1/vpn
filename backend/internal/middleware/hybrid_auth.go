package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

// HybridAuth handles authentication for both Telegram WebApp and browser access
func HybridAuth(botToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get access type from context (set by DetectAccessMethod middleware)
		accessType, exists := c.Get("access_type")
		if !exists {
			// Default to Telegram WebApp if not set
			accessType = AccessTelegramWebApp
		}

		switch accessType {
		case AccessTelegramWebApp:
			// Handle Telegram WebApp authentication
			handleTelegramAuth(c, botToken)
		case AccessBrowser:
			// Handle browser authentication (check for session token or OAuth)
			handleBrowserAuth(c)
		default:
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unknown access type",
			})
			c.Abort()
			return
		}

		// If authentication succeeded, continue
		if c.Writer.Status() != http.StatusUnauthorized {
			c.Next()
		}
	}
}

func handleTelegramAuth(c *gin.Context, botToken string) {
	initData := c.GetHeader("X-Telegram-Init-Data")
	if initData == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Missing Telegram init data",
		})
		c.Abort()
		return
	}

	// Parse init data
	parsedData, err := parseInitData(initData)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse init data")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid init data format",
		})
		c.Abort()
		return
	}

	// Verify hash
	if !verifyInitData(initData, botToken, parsedData.Hash) {
		log.Warn().Str("hash", parsedData.Hash).Msg("Invalid init data hash")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid init data signature",
		})
		c.Abort()
		return
	}

	// Check auth date (not older than 24 hours)
	if c.GetTime("auth_date").Unix()-parsedData.AuthDate > 86400 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Init data expired",
		})
		c.Abort()
		return
	}

	// Set user info in context
	c.Set("telegram_user_id", parsedData.User.ID)
	c.Set("telegram_user", parsedData.User)
	c.Set("auth_date", parsedData.AuthDate)
	c.Set("auth_method", "telegram")
}

func handleBrowserAuth(c *gin.Context) {
	// For browser access, we'll check for a session token

	// Get database instance from context
	dbInterface, exists := c.Get("db")
	if !exists {
		log.Error().Msg("Database not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Internal server error",
		})
		c.Abort()
		return
	}

	db, ok := dbInterface.(*database.DB)
	if !ok {
		log.Error().Msg("Invalid database type in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Internal server error",
		})
		c.Abort()
		return
	}

	// Check for Authorization header (Bearer token)
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate the token against database
		var session models.BrowserSession
		if err := db.DB.Where("token = ? AND expires_at > ?", token, time.Now()).First(&session).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid or expired token",
				})
				c.Abort()
				return
			}
			log.Error().Err(err).Msg("Database error")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
			})
			c.Abort()
			return
		}

		// Token is valid, set user info in context
		c.Set("user_id", session.UserID)
		c.Set("auth_method", "browser")
		return
	}

	// Alternative: Check for session cookie
	sessionCookie, err := c.Cookie("session_token")
	if err == nil && sessionCookie != "" {
		// Validate the session token against database
		var session models.BrowserSession
		if err := db.DB.Where("token = ? AND expires_at > ?", sessionCookie, time.Now()).First(&session).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid or expired session",
				})
				c.Abort()
				return
			}
			log.Error().Err(err).Msg("Database error")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
			})
			c.Abort()
			return
		}

		// Session is valid, set user info in context
		c.Set("user_id", session.UserID)
		c.Set("auth_method", "browser")
		return
	}

	// If no valid authentication found, return unauthorized
	// Instead of providing a direct auth URL, we'll let the frontend handle this
	c.JSON(http.StatusUnauthorized, gin.H{
		"error": "Authentication required",
	})
	c.Abort()
}
