package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"xray-vpn-connect/internal/database"
)

type ServerHandler struct {
	db *database.DB
}

func NewServerHandler(db *database.DB) *ServerHandler {
	return &ServerHandler{db: db}
}

func (h *ServerHandler) GetServers(c *gin.Context) {
	var servers []struct {
		ID       string `json:"id"`
		Country  string `json:"country"`
		Flag     string `json:"flag"`
		Protocol string `json:"protocol"`
		Status   string `json:"status"`
		Ping     int    `json:"ping"`
	}

	// For now, return static servers. In production, fetch from DB
	servers = []struct {
		ID       string `json:"id"`
		Country  string `json:"country"`
		Flag     string `json:"flag"`
		Protocol string `json:"protocol"`
		Status   string `json:"status"`
		Ping     int    `json:"ping"`
	}{
		{"de-1", "Германия", "🇩🇪", "vless", "online", 45},
		{"us-east", "США (Восток)", "🇺🇸", "vmess", "online", 120},
		{"nl-vip", "Нидерланды (VIP)", "🇳🇱", "vless", "crowded", 38},
		{"sg-asia", "Сингапур", "🇸🇬", "trojan", "maintenance", 180},
		{"fi-hel", "Финляндия", "🇫🇮", "vless", "online", 25},
	}

	c.JSON(http.StatusOK, gin.H{"servers": servers})
}

