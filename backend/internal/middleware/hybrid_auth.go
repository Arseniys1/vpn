package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
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
	// For browser access, we'll check for a session token or OAuth
	// This is a simplified implementation - in production, you would implement
	// proper OAuth flow with Telegram or session-based authentication

	// Check for Authorization header (Bearer token)
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		// In a real implementation, you would validate the token here
		// For now, we'll just check if it's a valid format
		if len(token) > 10 {
			// Mock user data for demonstration
			// In a real implementation, you would fetch user data from database
			c.Set("user_id", "browser_user_123")
			c.Set("auth_method", "browser")
			return
		}
	}

	// Alternative: Check for session cookie
	sessionCookie, err := c.Cookie("session_token")
	if err == nil && sessionCookie != "" {
		// In a real implementation, you would validate the session token
		// For now, we'll just check if it exists
		if len(sessionCookie) > 10 {
			c.Set("user_id", "browser_user_123")
			c.Set("auth_method", "browser")
			return
		}
	}

	// If no valid authentication found, return unauthorized
	c.JSON(http.StatusUnauthorized, gin.H{
		"error":    "Authentication required. Please authenticate via Telegram or provide valid credentials.",
		"auth_url": "/auth/telegram", // Endpoint for Telegram OAuth
	})
	c.Abort()
}
