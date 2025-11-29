package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type SubscriptionService struct {
	db *database.DB
}

func NewSubscriptionService(db *database.DB) *SubscriptionService {
	return &SubscriptionService{db: db}
}

func (s *SubscriptionService) GetActiveSubscription(userID uuid.UUID) (*models.Subscription, error) {
	var subscription models.Subscription
	now := time.Now()

	err := s.db.
		Preload("Plan").
		Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, now).
		Order("expires_at DESC").
		First(&subscription).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &subscription, nil
}

func (s *SubscriptionService) PurchaseSubscription(userID, planID uuid.UUID) (*models.Subscription, error) {
	// Get user
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Get plan
	var plan models.Plan
	if err := s.db.First(&plan, "id = ? AND is_active = ?", planID, true).Error; err != nil {
		return nil, fmt.Errorf("plan not found: %w", err)
	}

	// Check balance
	if user.Balance < plan.PriceStars {
		return nil, fmt.Errorf("insufficient balance")
	}

	// Deduct balance
	if err := s.db.Model(&user).Update("balance", gorm.Expr("balance - ?", plan.PriceStars)).Error; err != nil {
		return nil, fmt.Errorf("failed to deduct balance: %w", err)
	}

	// Get or create active subscription
	existing, _ := s.GetActiveSubscription(userID)
	
	var startTime time.Time
	if existing != nil && existing.ExpiresAt != nil && existing.ExpiresAt.After(time.Now()) {
		startTime = *existing.ExpiresAt
	} else {
		startTime = time.Now()
	}

	expiryTime := startTime.AddDate(0, plan.DurationMonths, 0)

	subscription := models.Subscription{
		UserID:    userID,
		PlanID:    planID,
		IsActive:  true,
		StartedAt: &startTime,
		ExpiresAt: &expiryTime,
	}

	// If existing subscription exists, update it; otherwise create new
	if existing != nil {
		existing.PlanID = planID
		existing.ExpiresAt = &expiryTime
		existing.IsActive = true
		if err := s.db.Save(existing).Error; err != nil {
			return nil, fmt.Errorf("failed to update subscription: %w", err)
		}
		return existing, nil
	}

	if err := s.db.Create(&subscription).Error; err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	return &subscription, nil
}

func (s *SubscriptionService) DeactivateExpiredSubscriptions() error {
	now := time.Now()
	return s.db.Model(&models.Subscription{}).
		Where("is_active = ? AND expires_at < ?", true, now).
		Update("is_active", false).Error
}

func (s *SubscriptionService) HasActiveSubscription(userID uuid.UUID) bool {
	subscription, _ := s.GetActiveSubscription(userID)
	return subscription != nil
}

