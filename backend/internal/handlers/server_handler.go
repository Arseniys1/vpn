package handlers

import (
	"github.com/google/uuid"
	"net/http"
	"xray-vpn-connect/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type ServerHandler struct {
	db          *database.DB
	userService *services.UserService
}

func NewServerHandler(db *database.DB, userService *services.UserService) *ServerHandler {
	return &ServerHandler{
		db:          db,
		userService: userService,
	}
}

func (h *ServerHandler) GetServers(c *gin.Context) {
	authMethod, _ := c.Get("auth_method")

	var user *models.User
	var err error

	switch authMethod {
	case "telegram":
		telegramUserID, _ := c.Get("telegram_user_id")
		user, err = h.userService.GetUserByTelegramID(telegramUserID.(int64))
	case "browser":
		// For browser access, get user by ID
		userID, _ := c.Get("user_id")
		userIdUuid, ok := userID.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Parse user id failed"})
			return
		}

		user, err = h.userService.GetUserByID(userIdUuid)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unknown authentication method"})
		return
	}

	var servers []models.Server

	// Get servers that are either:
	// 1. Not user-specific (available to all users)
	// 2. User-specific and assigned to this user
	if err := h.db.DB.
		Where("is_active = ? AND (is_user_specific = ? OR id IN (SELECT server_id FROM server_users WHERE user_id = ?))",
			true, false, user.ID).
		Find(&servers).Error; err != nil {
		log.Error().Err(err).Msg("Failed to get servers")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers"})
		return
	}

	// Transform to response format with realistic ping calculation
	type ServerResponse struct {
		ID           string  `json:"id"`
		Country      string  `json:"country"`
		Flag         string  `json:"flag"`
		Protocol     string  `json:"protocol"`
		Status       string  `json:"status"`
		Ping         int     `json:"ping"`
		AdminMessage *string `json:"admin_message,omitempty"`
	}

	response := make([]ServerResponse, 0, len(servers))
	for _, server := range servers {
		// Calculate realistic ping based on server location and current load
		ping := 30 + (server.CurrentLoad * 3)
		if server.Country == "United States" || server.Country == "Canada" {
			ping += 10
		} else if server.Country == "Germany" || server.Country == "Netherlands" || server.Country == "United Kingdom" {
			ping += 20
		} else if server.Country == "Singapore" || server.Country == "Japan" || server.Country == "South Korea" {
			ping += 40
		} else if server.Country == "Australia" || server.Country == "Brazil" {
			ping += 60
		} else {
			ping += 30 // Default for other locations
		}

		// Cap maximum ping
		if ping > 300 {
			ping = 300
		}

		response = append(response, ServerResponse{
			ID:           server.ID.String(),
			Country:      server.Country,
			Flag:         server.Flag,
			Protocol:     server.Protocol,
			Status:       server.Status,
			Ping:         ping,
			AdminMessage: server.AdminMessage,
		})
	}

	c.JSON(http.StatusOK, gin.H{"servers": response})
}
