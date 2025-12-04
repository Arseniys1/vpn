package middleware

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"net/http"
	"strings"
	"time"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

// Auth handles authentication for both Telegram WebApp and browser access
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
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
			if err := db.DB.Where("token = ? AND expires_at > ?", token, time.Now()).Preload("User").First(&session).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
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

			c.Set("user", session.User)
			c.Next()
			return
		}

		// Alternative: Check for session cookie
		sessionCookie, err := c.Cookie("session_token")
		if err == nil && sessionCookie != "" {
			// Validate the session token against database
			var session models.BrowserSession
			if err := db.DB.Where("token = ? AND expires_at > ?", sessionCookie, time.Now()).Preload("User").First(&session).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
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
			c.Set("user", session.User)
			c.Next()
			return
		}

		queryToken := c.Query("token")
		if queryToken != "" {
			var session models.BrowserSession
			if err := db.DB.Where("token = ? AND expires_at > ?", queryToken, time.Now()).Preload("User").First(&session).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
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
			c.Set("user", session.User)
			c.Next()
			return
		}

		// If no valid authentication found, return unauthorized
		// Instead of providing a direct auth URL, we'll let the frontend handle this
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		c.Abort()
	}
}
