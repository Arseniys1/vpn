package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type PaymentService struct {
	db     *database.DB
	config *config.Config
}

type TelegramInvoiceRequest struct {
	ChatID                   int64    `json:"chat_id"`
	Title                    string   `json:"title"`
	Description              string   `json:"description"`
	Payload                  string   `json:"payload"`
	ProviderToken            string   `json:"provider_token"`
	Currency                 string   `json:"currency"`
	Prices                   []Price  `json:"prices"`
	MaxTipAmount             *int     `json:"max_tip_amount,omitempty"`
	SuggestedTipAmounts      []int    `json:"suggested_tip_amounts,omitempty"`
	StartParameter           string   `json:"start_parameter,omitempty"`
	ProviderData             string   `json:"provider_data,omitempty"`
	PhotoUrl                 string   `json:"photo_url,omitempty"`
	PhotoSize                *int     `json:"photo_size,omitempty"`
	PhotoWidth               *int     `json:"photo_width,omitempty"`
	PhotoHeight              *int     `json:"photo_height,omitempty"`
	NeedName                 *bool    `json:"need_name,omitempty"`
	NeedPhoneNumber          *bool    `json:"need_phone_number,omitempty"`
	NeedEmail                *bool    `json:"need_email,omitempty"`
	NeedShippingAddress      *bool    `json:"need_shipping_address,omitempty"`
	SendPhoneNumberToProvider *bool   `json:"send_phone_number_to_provider,omitempty"`
	SendEmailToProvider      *bool    `json:"send_email_to_provider,omitempty"`
	IsFlexible               *bool    `json:"is_flexible,omitempty"`
}

type Price struct {
	Label  string `json:"label"`
	Amount int    `json:"amount"`
}

type TelegramInvoiceResponse struct {
	Ok     bool   `json:"ok"`
	Result string `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

func NewPaymentService(db *database.DB, config *config.Config) *PaymentService {
	return &PaymentService{
		db:     db,
		config: config,
	}
}

// CreatePayment creates a new payment record and returns an invoice link
func (s *PaymentService) CreatePayment(userID uuid.UUID, telegramID int64, amount int64) (*models.Payment, error) {
	// Create payment record
	payment := &models.Payment{
		UserID:     userID,
		TelegramID: telegramID,
		Amount:     amount,
		Status:     "pending",
		Payload:    fmt.Sprintf("stars_payment_%s", uuid.New().String()),
	}

	// Save payment to database
	if err := s.db.Create(payment).Error; err != nil {
		return nil, fmt.Errorf("failed to create payment record: %w", err)
	}

	// Create invoice link
	invoiceLink, err := s.createInvoiceLink(telegramID, amount, payment.Payload)
	if err != nil {
		// Update payment status to failed
		payment.Status = "failed"
		s.db.Save(payment)
		return nil, fmt.Errorf("failed to create invoice link: %w", err)
	}

	// Update payment with invoice link
	payment.InvoiceLink = invoiceLink
	if err := s.db.Save(payment).Error; err != nil {
		log.Warn().Err(err).Msg("Failed to update payment with invoice link")
	}

	return payment, nil
}

// createInvoiceLink creates an invoice link using Telegram's createInvoiceLink API
func (s *PaymentService) createInvoiceLink(chatID int64, amount int64, payload string) (string, error) {
	botToken := s.config.Telegram.BotToken
	if botToken == "" {
		return "", fmt.Errorf("TELEGRAM_BOT_TOKEN not configured")
	}

	// Prepare the request
	request := TelegramInvoiceRequest{
		ChatID:      chatID,
		Title:       "VPN Service Balance Top-up",
		Description: fmt.Sprintf("Top-up your VPN service balance with %d Telegram Stars", amount),
		Payload:     payload,
		// For Telegram Stars, provider_token should be empty
		ProviderToken: "",
		Currency:      "XTR", // XTR is the currency code for Telegram Stars
		Prices: []Price{
			{
				Label:  "VPN Service Balance",
				Amount: int(amount),
			},
		},
	}

	// Convert to JSON
	jsonData, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	url := fmt.Sprintf("https://api.telegram.org/bot%s/createInvoiceLink", botToken)
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var response TelegramInvoiceResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if !response.Ok {
		return "", fmt.Errorf("Telegram API returned error: %s", response.Error)
	}

	return response.Result, nil
}

// ProcessPaymentWebhook processes incoming payment webhooks from Telegram
func (s *PaymentService) ProcessPaymentWebhook(payload string, telegramID int64) error {
	// Find payment by payload
	var payment models.Payment
	if err := s.db.Where("payload = ? AND telegram_id = ?", payload, telegramID).First(&payment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("payment not found for payload: %s", payload)
		}
		return fmt.Errorf("failed to find payment: %w", err)
	}

	// Update payment status to completed
	payment.Status = "completed"
	if err := s.db.Save(&payment).Error; err != nil {
		return fmt.Errorf("failed to update payment status: %w", err)
	}

	// Update user balance
	if err := s.db.Model(&models.User{}).
		Where("id = ?", payment.UserID).
		Update("balance", gorm.Expr("balance + ?", payment.Amount)).Error; err != nil {
		return fmt.Errorf("failed to update user balance: %w", err)
	}

	log.Info().Str("user_id", payment.UserID.String()).Int64("amount", payment.Amount).Msg("Payment processed successfully")
	return nil
}

// GetPaymentByPayload retrieves a payment by its payload
func (s *PaymentService) GetPaymentByPayload(payload string) (*models.Payment, error) {
	var payment models.Payment
	if err := s.db.Where("payload = ?", payload).First(&payment).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}