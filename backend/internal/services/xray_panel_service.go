package services

import (
	"errors"
	"fmt"

	"github.com/google/uuid"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type XrayPanelService struct {
	db *database.DB
}

func NewXrayPanelService(db *database.DB) *XrayPanelService {
	return &XrayPanelService{db: db}
}

// GetActivePanels returns all active Xray panels
func (s *XrayPanelService) GetActivePanels() ([]models.XrayPanel, error) {
	var panels []models.XrayPanel
	if err := s.db.Where("is_active = ?", true).Find(&panels).Error; err != nil {
		return nil, err
	}
	return panels, nil
}

// GetPanelByID returns panel by ID
func (s *XrayPanelService) GetPanelByID(panelID uuid.UUID) (*models.XrayPanel, error) {
	var panel models.XrayPanel
	if err := s.db.First(&panel, "id = ? AND is_active = ?", panelID, true).Error; err != nil {
		return nil, err
	}
	return &panel, nil
}

// GetPanelByServerID returns panel associated with server
func (s *XrayPanelService) GetPanelByServerID(serverID uuid.UUID) (*models.XrayPanel, error) {
	var server models.Server
	if err := s.db.Preload("XrayPanel").First(&server, "id = ?", serverID).Error; err != nil {
		return nil, fmt.Errorf("server not found: %w", err)
	}

	if server.XrayPanelID == uuid.Nil {
		return nil, errors.New("server has no associated panel")
	}

	return &server.XrayPanel, nil
}

// CreatePanel creates a new Xray panel
func (s *XrayPanelService) CreatePanel(panel *models.XrayPanel) error {
	if err := s.db.Create(panel).Error; err != nil {
		return fmt.Errorf("failed to create panel: %w", err)
	}
	return nil
}

// UpdatePanel updates existing panel
func (s *XrayPanelService) UpdatePanel(panelID uuid.UUID, panel *models.XrayPanel) error {
	if err := s.db.Model(&models.XrayPanel{}).Where("id = ?", panelID).Updates(panel).Error; err != nil {
		return fmt.Errorf("failed to update panel: %w", err)
	}
	return nil
}

// DeletePanel soft deletes a panel
func (s *XrayPanelService) DeletePanel(panelID uuid.UUID) error {
	return s.db.Delete(&models.XrayPanel{}, "id = ?", panelID).Error
}

// ListPanels returns all panels (active and inactive)
func (s *XrayPanelService) ListPanels() ([]models.XrayPanel, error) {
	var panels []models.XrayPanel
	if err := s.db.Find(&panels).Error; err != nil {
		return nil, err
	}
	return panels, nil
}
