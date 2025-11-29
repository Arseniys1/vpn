package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type ServerHandler struct {
	db *database.DB
}

func NewServerHandler(db *database.DB) *ServerHandler {
	return &ServerHandler{db: db}
}

func (h *ServerHandler) GetServers(c *gin.Context) {
	var servers []models.Server

	if err := h.db.DB.Where("is_active = ?", true).Find(&servers).Error; err != nil {
		log.Error().Err(err).Msg("Failed to get servers")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers"})
		return
	}

	// Transform to response format with ping (mock for now)
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
		// Calculate mock ping based on server location (could be real ping later)
		ping := 50 + (server.CurrentLoad * 2)
		if ping > 200 {
			ping = 200
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
