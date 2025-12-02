package services

import (
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type UserService struct {
	db *database.DB
}

func NewUserService(db *database.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) GetOrCreateUser(telegramID int64, username, firstName, lastName, languageCode string) (*models.User, error) {
	var user models.User
	result := s.db.Where("telegram_id = ?", telegramID).First(&user)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// Create new user
		user = models.User{
			TelegramID:   telegramID,
			Username:     stringPtr(username),
			FirstName:    firstName,
			LastName:     stringPtr(lastName),
			LanguageCode: languageCode,
			Balance:      0,
			IsActive:     true,
			IsAdmin:      false,
		}

		if err := s.db.Create(&user).Error; err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}

		// Create referral stats
		stats := models.ReferralStats{
			UserID: user.ID,
		}
		if err := s.db.Create(&stats).Error; err != nil {
			return nil, fmt.Errorf("failed to create referral stats: %w", err)
		}

		return &user, nil
	} else if result.Error != nil {
		return nil, fmt.Errorf("failed to query user: %w", result.Error)
	}

	// Update user info
	user.Username = stringPtr(username)
	user.FirstName = firstName
	user.LastName = stringPtr(lastName)
	user.LanguageCode = languageCode
	if err := s.db.Save(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return &user, nil
}

func (s *UserService) GetUserByID(userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) GetUserByTelegramID(telegramID int64) (*models.User, error) {
	var user models.User
	if err := s.db.Where("telegram_id = ?", telegramID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) UpdateBalance(userID uuid.UUID, amount int64) error {
	return s.db.Model(&models.User{}).Where("id = ?", userID).Update("balance", gorm.Expr("balance + ?", amount)).Error
}

func (s *UserService) UseReferralCode(userID uuid.UUID, referralCode string) error {
	var referrer models.User
	if err := s.db.Where("referral_code = ?", referralCode).First(&referrer).Error; err != nil {
		return fmt.Errorf("invalid referral code")
	}

	if referrer.ID == userID {
		return fmt.Errorf("cannot use your own referral code")
	}

	// Update user's referred_by
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Update("referred_by", referrer.ID).Error; err != nil {
		return err
	}

	// Update referral stats
	if err := s.db.Model(&models.ReferralStats{}).
		Where("user_id = ?", referrer.ID).
		Updates(map[string]interface{}{
			"total_referrals": gorm.Expr("total_referrals + 1"),
			"last_updated":    gorm.Expr("NOW()"),
		}).Error; err != nil {
		return err
	}

	return nil
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
