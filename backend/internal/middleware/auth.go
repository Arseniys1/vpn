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
			log.Warn().Str("received_hash", parsedData.Hash).Msg("Invalid init data hash")
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
