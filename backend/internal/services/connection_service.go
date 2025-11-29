package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
	"xray-vpn-connect/internal/queue"
	"xray-vpn-connect/internal/services/xray"
)

type ConnectionService struct {
	db      *database.DB
	queue   *queue.Queue
	xrayClients map[uuid.UUID]*xray.Client
}

func NewConnectionService(db *database.DB, q *queue.Queue) *ConnectionService {
	return &ConnectionService{
		db:      db,
		queue:   q,
		xrayClients: make(map[uuid.UUID]*xray.Client),
	}
}

func (s *ConnectionService) CreateConnection(userID, serverID uuid.UUID) (*models.Connection, error) {
	// Get server
	var server models.Server
	if err := s.db.Preload("XrayPanel").First(&server, "id = ? AND is_active = ?", serverID, true).Error; err != nil {
		return nil, fmt.Errorf("server not found: %w", err)
	}

	// Check if user already has connection to this server
	var existing models.Connection
	if err := s.db.Where("user_id = ? AND server_id = ? AND is_active = ?", userID, serverID, true).First(&existing).Error; err == nil {
		return &existing, nil
	}

	// Get user
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Create connection record
	connection := models.Connection{
		UserID:      userID,
		ServerID:    serverID,
		IsActive:    true,
		TrafficUsed: 0,
	}

	// Set expiry based on subscription
	var subscription models.Subscription
	if err := s.db.Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, time.Now()).
		Order("expires_at DESC").First(&subscription).Error; err == nil && subscription.ExpiresAt != nil {
		connection.ExpiresAt = subscription.ExpiresAt
	}

	if err := s.db.Create(&connection).Error; err != nil {
		return nil, fmt.Errorf("failed to create connection: %w", err)
	}

	// Publish task to queue for async creation in Xray panel
	if s.queue != nil {
		if err := s.queue.PublishTask(queue.Task{
			Type:        queue.TaskCreateConnection,
			UserID:      userID,
			ServerID:    serverID,
			ConnectionID: connection.ID,
			Data: map[string]interface{}{
				"server_name": server.Name,
				"protocol":    server.Protocol,
			},
		}); err != nil {
			// Log error but don't fail connection creation
			// Connection will be created in Xray when worker processes the task
		}
	}

	return &connection, nil
}

func (s *ConnectionService) GetUserConnections(userID uuid.UUID) ([]models.Connection, error) {
	var connections []models.Connection
	if err := s.db.
		Preload("Server").
		Where("user_id = ? AND is_active = ?", userID, true).
		Find(&connections).Error; err != nil {
		return nil, err
	}
	return connections, nil
}

func (s *ConnectionService) GetConnection(connectionID uuid.UUID) (*models.Connection, error) {
	var connection models.Connection
	if err := s.db.
		Preload("Server").
		Preload("User").
		First(&connection, "id = ?", connectionID).Error; err != nil {
		return nil, err
	}
	return &connection, nil
}

func (s *ConnectionService) DeleteConnection(connectionID uuid.UUID) error {
	connection, err := s.GetConnection(connectionID)
	if err != nil {
		return err
	}

	// Publish delete task
	if s.queue != nil {
		if err := s.queue.PublishTask(queue.Task{
			Type:        queue.TaskDeleteConnection,
			ConnectionID: connectionID,
			UserID:      connection.UserID,
			ServerID:    connection.ServerID,
		}); err != nil {
			// Log error
		}
	}

	// Soft delete connection
	return s.db.Delete(connection).Error
}

func (s *ConnectionService) UpdateConnectionKey(connectionID uuid.UUID, key, subscriptionLink string) error {
	return s.db.Model(&models.Connection{}).
		Where("id = ?", connectionID).
		Updates(map[string]interface{}{
			"connection_key":    key,
			"subscription_link": subscriptionLink,
		}).Error
}

