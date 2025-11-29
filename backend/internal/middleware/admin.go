package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

// RequireAdmin middleware checks if user is admin
func RequireAdmin(db *database.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		telegramUserID, exists := c.Get("telegram_user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		// Get user from database
		var user models.User
		if err := db.DB.Where("telegram_id = ?", telegramUserID.(int64)).First(&user).Error; err != nil {
			log.Error().Err(err).Msg("Failed to get user")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Check if user is admin
		if !user.IsAdmin {
			log.Warn().
				Int64("telegram_id", telegramUserID.(int64)).
				Msg("Non-admin user attempted to access admin endpoint")
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied. Admin privileges required."})
			c.Abort()
			return
		}

		// Set user ID in context
		c.Set("user_id", user.ID)
		c.Set("user", user)

		c.Next()
	}
}

// OptionalAdmin middleware sets admin status without requiring it
func OptionalAdmin(db *database.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		telegramUserID, exists := c.Get("telegram_user_id")
		if !exists {
			c.Next()
			return
		}

		// Get user from database
		var user models.User
		if err := db.DB.Where("telegram_id = ?", telegramUserID.(int64)).First(&user).Error; err != nil {
			c.Next()
			return
		}

		// Set admin status in context
		c.Set("is_admin", user.IsAdmin)
		c.Set("user_id", user.ID)

		c.Next()
	}
}
