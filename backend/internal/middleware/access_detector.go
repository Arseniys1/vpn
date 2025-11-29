package middleware

import (
	"github.com/gin-gonic/gin"
)

// AccessType represents the type of client access
type AccessType string

const (
	AccessTelegramWebApp AccessType = "telegram_webapp"
	AccessBrowser        AccessType = "browser"
)

// DetectAccessMethod detects whether the request is from Telegram WebApp or browser
func DetectAccessMethod() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for Telegram WebApp init data
		initData := c.GetHeader("X-Telegram-Init-Data")
		if initData != "" {
			// Request is from Telegram WebApp
			c.Set("access_type", AccessTelegramWebApp)
			c.Set("is_telegram", true)
		} else {
			// Request is from browser
			c.Set("access_type", AccessBrowser)
			c.Set("is_telegram", false)
		}

		c.Next()
	}
}
