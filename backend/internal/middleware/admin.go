package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/models"
)

// RequireAdmin middleware checks if user is admin
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		userInterface, _ := c.Get("user")

		user, ok := userInterface.(models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user from session"})
			return
		}

		// Check if user is admin
		if !user.IsAdmin {
			log.Warn().
				Str("user_id", user.ID.String()).
				Msg("Non-admin user attempted to access admin endpoint")
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied. Admin privileges required."})
			c.Abort()
			return
		}

		c.Next()
	}
}
