package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"io"
	"net/http"
	"strings"
	"time"
	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
	"xray-vpn-connect/internal/services"
)

type Update struct {
	UpdateID int `json:"update_id"`
	Message  struct {
		MessageID int `json:"message_id"`
		From      struct {
			ID           int64  `json:"id"`
			FirstName    string `json:"first_name"`
			LastName     string `json:"last_name,omitempty"`
			Username     string `json:"username,omitempty"`
			LanguageCode string `json:"language_code,omitempty"`
		} `json:"from"`
		Chat struct {
			ID   int64  `json:"id"`
			Type string `json:"type"`
		} `json:"chat"`
		Date              int    `json:"date"`
		Text              string `json:"text"`
		SuccessfulPayment struct {
			Currency                string `json:"currency"`
			TotalAmount             int    `json:"total_amount"`
			InvoicePayload          string `json:"invoice_payload"`
			TelegramPaymentChargeID string `json:"telegram_payment_charge_id"`
			ProviderPaymentChargeID string `json:"provider_payment_charge_id"`
		} `json:"successful_payment,omitempty"`
	} `json:"message,omitempty"`
	CallbackQuery struct {
		ID   string `json:"id"`
		From struct {
			ID        int64  `json:"id"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name,omitempty"`
			Username  string `json:"username,omitempty"`
		} `json:"from"`
		Message struct {
			MessageID int `json:"message_id"`
			Chat      struct {
				ID   int64  `json:"id"`
				Type string `json:"type"`
			} `json:"chat"`
		} `json:"message"`
		Data string `json:"data"`
	} `json:"callback_query,omitempty"`
	PreCheckoutQuery struct {
		ID   string `json:"id"`
		From struct {
			ID int64 `json:"id"`
		} `json:"from"`
		Currency         string `json:"currency"`
		TotalAmount      int    `json:"total_amount"`
		InvoicePayload   string `json:"invoice_payload"`
		ShippingOptionID string `json:"shipping_option_id,omitempty"`
		OrderInfo        struct {
			Name            string `json:"name,omitempty"`
			PhoneNumber     string `json:"phone_number,omitempty"`
			Email           string `json:"email,omitempty"`
			ShippingAddress struct {
				CountryCode string `json:"country_code"`
				State       string `json:"state"`
				City        string `json:"city"`
				StreetLine1 string `json:"street_line1"`
				StreetLine2 string `json:"street_line2"`
				PostCode    string `json:"post_code"`
			} `json:"shipping_address,omitempty"`
		} `json:"order_info,omitempty"`
	} `json:"pre_checkout_query,omitempty"`
}

type WebHookHandler struct {
	db             *database.DB
	config         *config.Config
	userService    *services.UserService
	paymentService *services.PaymentService
}

func NewWebhookHandler(db *database.DB, userService *services.UserService, paymentService *services.PaymentService) *WebHookHandler {
	return &WebHookHandler{
		db:             db,
		userService:    userService,
		paymentService: paymentService,
	}
}

func (h *WebHookHandler) SetConfig(cfg *config.Config) {
	h.config = cfg
}

func (h *WebHookHandler) HandleWebhook(c *gin.Context) {
	var update Update

	if c.Request.Body != nil {
		bodyBytes, _ := io.ReadAll(c.Request.Body)

		log.Info().Str("raw_body", string(bodyBytes)).Msg("Incoming Telegram webhook")

		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	}

	if err := c.ShouldBindJSON(&update); err != nil {
		log.Error().Err(err).Msg("Failed to parse Telegram webhook")
		c.JSON(http.StatusOK, gin.H{})
		return
	}

	switch {
	case update.Message.Text != "":
		h.commands(c, update)
	case update.PreCheckoutQuery.ID != "" || update.Message.SuccessfulPayment.InvoicePayload != "":
		h.starsPayment(c, update)
	default:
		log.Error().Msg("Invalid update type")
		c.JSON(http.StatusOK, gin.H{})
	}
}

// commands handles incoming Telegram bot commands
func (h *WebHookHandler) commands(c *gin.Context, update Update) {
	// Handle /start command with state parameter
	if update.Message.Text != "" && strings.HasPrefix(update.Message.Text, "/start ") {
		state := strings.TrimPrefix(update.Message.Text, "/start ")

		// Validate the state parameter
		var authSession models.AuthSession
		if err := h.db.DB.Where("state = ? AND expires_at > ?", state, time.Now()).First(&authSession).Error; err != nil {
			log.Warn().Str("state", state).Msg("Invalid or expired authentication session")
			// Send message to user
			SendTelegramMessage(h.db, h.config, update.Message.Chat.ID, "❌ Authentication session expired or invalid. Please try again from the browser.")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

		// Get or create user based on Telegram ID
		user, err := h.userService.GetOrCreateUser(update.Message.From.ID, update.Message.From.Username, update.Message.From.FirstName, update.Message.From.LastName, update.Message.From.LanguageCode)
		if err != nil {
			log.Error().Err(err).Int64("telegram_id", update.Message.From.ID).Msg("Failed to get or create user")
			SendTelegramMessage(h.db, h.config, update.Message.Chat.ID, "❌ Failed to authenticate. Please try again later.")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

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
			SendTelegramMessage(h.db, h.config, update.Message.Chat.ID, "❌ Failed to create session. Please try again later.")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

		// Delete the used auth session to prevent replay attacks
		if err := h.db.DB.Delete(&authSession).Error; err != nil {
			log.Warn().Err(err).Msg("Failed to delete auth session")
		}

		// Send success message to user with link to continue
		frontendURL := h.config.Telegram.FrontendURL
		if frontendURL == "" {
			frontendURL = "http://localhost:3000" // default for development
		}

		// Send message to user with inline button
		c.JSON(http.StatusOK, gin.H{
			"method":  "sendMessage",
			"chat_id": update.Message.Chat.ID,
			"text":    "✅ Authentication successful!\n\nClick the button below to continue to the app:",
			"reply_markup": map[string]interface{}{
				"inline_keyboard": [][]map[string]interface{}{
					{
						{
							"text": "Continue to App",
							"web_app": map[string]string{
								"url": frontendURL,
							},
						},
					},
				},
			},
		})
		return
	}

	// Handle any command (including /start without state) with a proper response and button
	if update.Message.Text != "" {
		// Check if bot username is configured
		if h.config.Telegram.BotUsername == "" {
			log.Warn().Msg("TELEGRAM_BOT_USERNAME not configured")
			c.JSON(http.StatusOK, gin.H{
				"method":  "sendMessage",
				"chat_id": update.Message.Chat.ID,
				"text":    "❌ Bot is not properly configured. Please contact the administrator.",
			})
			return
		}

		// Get frontend URL from config
		frontendURL := h.config.Telegram.FrontendURL
		if frontendURL == "" {
			frontendURL = "https://your-domain.com" // fallback
		}

		// Handle specific commands
		switch update.Message.Text {
		case "/start", "/help", "/info":
			helpText := "🌟 Welcome to VPN Connect!\n\n"
			helpText += "This bot allows you to manage your VPN subscription and connections directly from Telegram.\n\n"
			helpText += "Click the button below to open the application:"

			// Send message with button to open Mini App
			c.JSON(http.StatusOK, gin.H{
				"method":  "sendMessage",
				"chat_id": update.Message.Chat.ID,
				"text":    helpText,
				"reply_markup": map[string]interface{}{
					"inline_keyboard": [][]map[string]interface{}{
						{
							{
								"text": "Open VPN App",
								"web_app": map[string]string{
									"url": frontendURL,
								},
							},
						},
					},
				},
			})
		default:
			// For any other command, show help
			c.JSON(http.StatusOK, gin.H{
				"method":  "sendMessage",
				"chat_id": update.Message.Chat.ID,
				"text":    "I didn't understand that command. Click the button below to open the VPN application:",
				"reply_markup": map[string]interface{}{
					"inline_keyboard": [][]map[string]interface{}{
						{
							{
								"text": "Open VPN App",
								"web_app": map[string]string{
									"url": frontendURL,
								},
							},
						},
					},
				},
			})
		}
		return
	}

	// Default response for non-message updates (e.g., callback queries)
	c.JSON(http.StatusOK, gin.H{})
}

// starsPayment handles incoming payment confirmations from Telegram
func (h *WebHookHandler) starsPayment(c *gin.Context, update Update) {
	// Handle pre-checkout query
	if update.PreCheckoutQuery.ID != "" {
		// Approve the pre-checkout query
		botToken := h.config.Telegram.BotToken
		if botToken == "" {
			log.Error().Msg("TELEGRAM_BOT_TOKEN not configured")
			c.JSON(http.StatusOK, gin.H{})
			return
		}

		// Send pre-checkout query approval
		url := fmt.Sprintf("https://api.telegram.org/bot%s/answerPreCheckoutQuery", botToken)
		payload := map[string]interface{}{
			"pre_checkout_query_id": update.PreCheckoutQuery.ID,
			"ok":                    true,
		}

		jsonPayload, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Error().Err(err).Msg("Failed to send pre-checkout query approval")
		} else {
			resp.Body.Close()
		}

		c.JSON(http.StatusOK, gin.H{})
		return
	}

	// Handle successful payment
	if update.Message.SuccessfulPayment.InvoicePayload != "" {
		// Process the payment
		err := h.paymentService.ProcessPaymentWebhook(
			update.Message.SuccessfulPayment.InvoicePayload,
			update.Message.From.ID,
		)
		if err != nil {
			log.Error().Err(err).Msg("Failed to process payment webhook")
			// We still return 200 OK to Telegram
		}

		// Send confirmation message to user
		if update.Message.Chat.ID != 0 {
			SendTelegramMessage(h.db, h.config, update.Message.Chat.ID,
				fmt.Sprintf("✅ Payment successful! Your balance has been topped up with %d Stars.", update.Message.SuccessfulPayment.TotalAmount))
		}

		c.JSON(http.StatusOK, gin.H{})
		return
	}

	// Default response
	c.JSON(http.StatusOK, gin.H{})
}
