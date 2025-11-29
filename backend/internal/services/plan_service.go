package services

import (
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type PlanService struct {
	db *database.DB
}

func NewPlanService(db *database.DB) *PlanService {
	return &PlanService{db: db}
}

func (s *PlanService) GetActivePlans() ([]models.Plan, error) {
	var plans []models.Plan
	if err := s.db.Where("is_active = ?", true).Order("duration_months ASC").Find(&plans).Error; err != nil {
		return nil, err
	}
	return plans, nil
}

func (s *PlanService) GetPlanByID(planID string) (*models.Plan, error) {
	var plan models.Plan
	if err := s.db.Where("id = ? AND is_active = ?", planID, true).First(&plan).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}

