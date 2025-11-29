package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/services"
)

type ConnectionHandler struct {
	connectionService *services.ConnectionService
	userService       *services.UserService
}

func NewConnectionHandler(connectionService *services.ConnectionService, userService *services.UserService) *ConnectionHandler {
	return &ConnectionHandler{
		connectionService: connectionService,
		userService:       userService,
	}
}

func (h *ConnectionHandler) CreateConnection(c *gin.Context) {
	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		ServerID uuid.UUID `json:"server_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	connection, err := h.connectionService.CreateConnection(user.ID, req.ServerID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create connection")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Return connection with generated URLs
	response := gin.H{
		"id":               connection.ID,
		"server_id":        connection.ServerID,
		"config_url":       connection.ConnectionKey,
		"subscription_url": connection.SubscriptionLink,
		"is_active":        connection.IsActive,
		"expires_at":       connection.ExpiresAt,
		"created_at":       connection.CreatedAt,
	}

	c.JSON(http.StatusOK, response)
}

func (h *ConnectionHandler) GetMyConnections(c *gin.Context) {
	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	connections, err := h.connectionService.GetUserConnections(user.ID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get connections")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get connections"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"connections": connections})
}

func (h *ConnectionHandler) DeleteConnection(c *gin.Context) {
	connectionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	if err := h.connectionService.DeleteConnection(connectionID); err != nil {
		log.Error().Err(err).Msg("Failed to delete connection")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete connection"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Connection deleted successfully"})
}
