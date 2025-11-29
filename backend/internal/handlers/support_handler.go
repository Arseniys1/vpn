package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
	"xray-vpn-connect/internal/services"
)

type SupportHandler struct {
	db          *database.DB
	userService *services.UserService
}

func NewSupportHandler(db *database.DB, userService *services.UserService) *SupportHandler {
	return &SupportHandler{
		db:          db,
		userService: userService,
	}
}

type CreateTicketRequest struct {
	Subject  string `json:"subject" binding:"required"`
	Message  string `json:"message" binding:"required"`
	Category string `json:"category" binding:"required"`
}

func (h *SupportHandler) CreateTicket(c *gin.Context) {
	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ticket := models.SupportTicket{
		UserID:   user.ID,
		Subject:  req.Subject,
		Message:  req.Message,
		Category: req.Category,
		Status:   "open",
	}

	if err := h.db.DB.Create(&ticket).Error; err != nil {
		log.Error().Err(err).Msg("Failed to create ticket")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ticket"})
		return
	}

	c.JSON(http.StatusCreated, ticket)
}

func (h *SupportHandler) GetMyTickets(c *gin.Context) {
	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var tickets []models.SupportTicket

	if err := h.db.DB.Where("user_id = ?", user.ID).
		Order("created_at DESC").
		Find(&tickets).Error; err != nil {
		log.Error().Err(err).Msg("Failed to get tickets")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tickets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tickets": tickets})
}

func (h *SupportHandler) GetTicket(c *gin.Context) {
	ticketID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var ticket models.SupportTicket
	if err := h.db.DB.Preload("Messages").
		Where("id = ? AND user_id = ?", ticketID, user.ID).
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

type AddMessageRequest struct {
	Message string `json:"message" binding:"required"`
}

func (h *SupportHandler) AddMessage(c *gin.Context) {
	ticketID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	telegramUserID, _ := c.Get("telegram_user_id")
	user, err := h.userService.GetUserByTelegramID(telegramUserID.(int64))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req AddMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify ticket belongs to user
	var ticket models.SupportTicket
	if err := h.db.DB.Where("id = ? AND user_id = ?", ticketID, user.ID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	message := models.TicketMessage{
		TicketID: ticketID,
		UserID:   user.ID,
		IsAdmin:  false,
		Message:  req.Message,
	}

	if err := h.db.DB.Create(&message).Error; err != nil {
		log.Error().Err(err).Msg("Failed to create message")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create message"})
		return
	}

	c.JSON(http.StatusCreated, message)
}
