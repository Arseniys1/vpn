package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// TelegramInitData represents Telegram WebApp init data
type TelegramInitData struct {
	QueryID    string
	User       TelegramUser
	AuthDate   int64
	Hash       string
}

type TelegramUser struct {
	ID           int64  `json:"id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name,omitempty"`
	Username     string `json:"username,omitempty"`
	LanguageCode string `json:"language_code,omitempty"`
}

// VerifyTelegramWebApp verifies Telegram WebApp init data
func VerifyTelegramWebApp(botToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
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
		if time.Now().Unix()-parsedData.AuthDate > 86400 {
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

		c.Next()
	}
}

func parseInitData(initData string) (*TelegramInitData, error) {
	parts := strings.Split(initData, "&")
	data := &TelegramInitData{}

	for _, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}

		key := kv[0]
		value := kv[1]

		switch key {
		case "query_id":
			data.QueryID = value
		case "user":
			// User is JSON encoded
			userJSON, err := hex.DecodeString(value)
			if err != nil {
				// Try without hex decoding
				userJSON = []byte(value)
			}
			if err := json.Unmarshal(userJSON, &data.User); err != nil {
				// Try URL decoding first
				decoded, err := url.QueryUnescape(value)
				if err == nil {
					userJSON = []byte(decoded)
					err = json.Unmarshal(userJSON, &data.User)
				}
				if err != nil {
					return nil, err
				}
			}
		case "auth_date":
			_, err := fmt.Sscanf(value, "%d", &data.AuthDate)
			if err != nil {
				return nil, err
			}
		case "hash":
			data.Hash = value
		}
	}

	return data, nil
}

func verifyInitData(initData, botToken, receivedHash string) bool {
	// Remove hash from init data for verification
	parts := strings.Split(initData, "&")
	var dataParts []string
	for _, part := range parts {
		if !strings.HasPrefix(part, "hash=") {
			dataParts = append(dataParts, part)
		}
	}

	// Sort key-value pairs
	sort.Strings(dataParts)
	dataCheckString := strings.Join(dataParts, "\n")

	// Create secret key
	secretKey := hmac.New(sha256.New, []byte("WebAppData"))
	secretKey.Write([]byte(botToken))
	secret := secretKey.Sum(nil)

	// Calculate hash
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(dataCheckString))
	calculatedHash := hex.EncodeToString(h.Sum(nil))

	return calculatedHash == receivedHash
}

