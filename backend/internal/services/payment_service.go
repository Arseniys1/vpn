package services

import (
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type PaymentService struct {
	db              *database.DB
	config          *config.Config
	telegramService *TelegramService
}

func NewPaymentService(db *database.DB, config *config.Config, telegramService *TelegramService) *PaymentService {
	return &PaymentService{
		db:              db,
		config:          config,
		telegramService: telegramService,
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
	invoiceLink, err := s.telegramService.CreateInvoiceLink(telegramID, amount, payment.Payload)
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

// ProcessPaymentWebhook processes incoming payment webhooks from Telegram
func (s *PaymentService) ProcessPaymentWebhook(payload string, telegramID int64) error {
	// Find payment by payload
	var payment models.Payment
	if err := s.db.Where("payload = ? AND telegram_id = ?", payload, telegramID).First(&payment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
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
