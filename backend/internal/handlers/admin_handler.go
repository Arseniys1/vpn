package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
)

type AdminHandler struct {
	db *database.DB
}

func NewAdminHandler(db *database.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// Stats
type StatsResponse struct {
	TotalUsers          int64 `json:"total_users"`
	ActiveSubscriptions int64 `json:"active_subscriptions"`
	MonthlyRevenue      int64 `json:"monthly_revenue"`
	OpenTickets         int64 `json:"open_tickets"`
	TotalConnections    int64 `json:"total_connections"`
	TotalServers        int64 `json:"total_servers"`
}

func (h *AdminHandler) GetStats(c *gin.Context) {
	var stats StatsResponse

	// Count users
	h.db.DB.Model(&models.User{}).Count(&stats.TotalUsers)

	// Count active subscriptions
	h.db.DB.Model(&models.Subscription{}).Where("is_active = ?", true).Count(&stats.ActiveSubscriptions)

	// Count open tickets
	h.db.DB.Model(&models.SupportTicket{}).Where("status = ?", "open").Count(&stats.OpenTickets)

	// Count total connections
	h.db.DB.Model(&models.Connection{}).Count(&stats.TotalConnections)

	// Count total servers
	h.db.DB.Model(&models.Server{}).Where("is_active = ?", true).Count(&stats.TotalServers)

	// Calculate monthly revenue from active subscriptions
	var totalRevenue int64
	h.db.DB.Table("subscriptions").
		Joins("JOIN plans ON subscriptions.plan_id = plans.id").
		Where("subscriptions.is_active = ? AND plans.is_active = ?", true, true).
		Select("SUM(plans.price_stars)").
		Row().Scan(&totalRevenue)
	stats.MonthlyRevenue = totalRevenue

	c.JSON(http.StatusOK, stats)
}

// Server Management
func (h *AdminHandler) GetAllServers(c *gin.Context) {
	var servers []models.Server

	if err := h.db.DB.Find(&servers).Error; err != nil {
		log.Error().Err(err).Msg("Failed to get servers")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get servers"})
		return
	}

	c.JSON(http.StatusOK, servers)
}

type CreateServerRequest struct {
	Name           string  `json:"name" binding:"required"`
	Country        string  `json:"country" binding:"required"`
	Flag           string  `json:"flag" binding:"required"`
	Protocol       string  `json:"protocol" binding:"required"`
	Status         string  `json:"status"`
	AdminMessage   *string `json:"admin_message"`
	MaxConnections int     `json:"max_connections"`
}

func (h *AdminHandler) CreateServer(c *gin.Context) {
	var req CreateServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	server := models.Server{
		Name:           req.Name,
		Country:        req.Country,
		Flag:           req.Flag,
		Protocol:       req.Protocol,
		Status:         req.Status,
		AdminMessage:   req.AdminMessage,
		MaxConnections: req.MaxConnections,
		IsActive:       true,
	}

	if server.Status == "" {
		server.Status = "online"
	}

	if server.MaxConnections == 0 {
		server.MaxConnections = 1000
	}

	if err := h.db.DB.Create(&server).Error; err != nil {
		log.Error().Err(err).Msg("Failed to create server")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create server"})
		return
	}

	c.JSON(http.StatusCreated, server)
}

func (h *AdminHandler) UpdateServer(c *gin.Context) {
	serverID := c.Param("id")
	id, err := uuid.Parse(serverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	var req CreateServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var server models.Server
	if err := h.db.DB.First(&server, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	server.Name = req.Name
	server.Country = req.Country
	server.Flag = req.Flag
	server.Protocol = req.Protocol
	server.Status = req.Status
	server.AdminMessage = req.AdminMessage
	server.MaxConnections = req.MaxConnections

	if err := h.db.DB.Save(&server).Error; err != nil {
		log.Error().Err(err).Msg("Failed to update server")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update server"})
		return
	}

	c.JSON(http.StatusOK, server)
}

func (h *AdminHandler) DeleteServer(c *gin.Context) {
	serverID := c.Param("id")
	id, err := uuid.Parse(serverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid server ID"})
		return
	}

	if err := h.db.DB.Delete(&models.Server{}, "id = ?", id).Error; err != nil {
		log.Error().Err(err).Msg("Failed to delete server")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete server"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server deleted successfully"})
}

// User Management
func (h *AdminHandler) GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")

	offset := (page - 1) * limit

	var users []models.User
	var total int64

	query := h.db.DB.Model(&models.User{})

	if search != "" {
		query = query.Where("first_name ILIKE ? OR username ILIKE ? OR telegram_id::text LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	query.Count(&total)

	if err := query.Preload("Subscription").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		log.Error().Err(err).Msg("Failed to get users")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

type UpdateUserRequest struct {
	Balance  *int64 `json:"balance"`
	IsActive *bool  `json:"is_active"`
	IsAdmin  *bool  `json:"is_admin"`
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	id, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if req.Balance != nil {
		user.Balance = *req.Balance
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}
	if req.IsAdmin != nil {
		user.IsAdmin = *req.IsAdmin
	}

	if err := h.db.DB.Save(&user).Error; err != nil {
		log.Error().Err(err).Msg("Failed to update user")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// Plan Management
func (h *AdminHandler) GetAllPlans(c *gin.Context) {
	var plans []models.Plan

	if err := h.db.DB.Find(&plans).Error; err != nil {
		log.Error().Err(err).Msg("Failed to get plans")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get plans"})
		return
	}

	c.JSON(http.StatusOK, plans)
}

type CreatePlanRequest struct {
	Name           string  `json:"name" binding:"required"`
	DurationMonths int     `json:"duration_months" binding:"required"`
	PriceStars     int64   `json:"price_stars" binding:"required"`
	Discount       *string `json:"discount"`
}

func (h *AdminHandler) CreatePlan(c *gin.Context) {
	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	plan := models.Plan{
		Name:           req.Name,
		DurationMonths: req.DurationMonths,
		PriceStars:     req.PriceStars,
		Discount:       req.Discount,
		IsActive:       true,
	}

	if err := h.db.DB.Create(&plan).Error; err != nil {
		log.Error().Err(err).Msg("Failed to create plan")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plan"})
		return
	}

	c.JSON(http.StatusCreated, plan)
}

func (h *AdminHandler) UpdatePlan(c *gin.Context) {
	planID := c.Param("id")
	id, err := uuid.Parse(planID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan ID"})
		return
	}

	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var plan models.Plan
	if err := h.db.DB.First(&plan, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	plan.Name = req.Name
	plan.DurationMonths = req.DurationMonths
	plan.PriceStars = req.PriceStars
	plan.Discount = req.Discount

	if err := h.db.DB.Save(&plan).Error; err != nil {
		log.Error().Err(err).Msg("Failed to update plan")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update plan"})
		return
	}

	c.JSON(http.StatusOK, plan)
}

func (h *AdminHandler) DeletePlan(c *gin.Context) {
	planID := c.Param("id")
	id, err := uuid.Parse(planID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan ID"})
		return
	}

	if err := h.db.DB.Delete(&models.Plan{}, "id = ?", id).Error; err != nil {
		log.Error().Err(err).Msg("Failed to delete plan")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Plan deleted successfully"})
}

// Ticket Management
func (h *AdminHandler) GetAllTickets(c *gin.Context) {
	status := c.Query("status")

	var tickets []models.SupportTicket
	query := h.db.DB.Preload("User")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&tickets).Error; err != nil {
		log.Error().Err(err).Msg("Failed to get tickets")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tickets"})
		return
	}

	c.JSON(http.StatusOK, tickets)
}

type ReplyTicketRequest struct {
	Reply  string `json:"reply" binding:"required"`
	Status string `json:"status"`
}

func (h *AdminHandler) ReplyToTicket(c *gin.Context) {
	ticketID := c.Param("id")
	id, err := uuid.Parse(ticketID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var req ReplyTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var ticket models.SupportTicket
	if err := h.db.DB.First(&ticket, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	ticket.AdminReply = &req.Reply
	if req.Status != "" {
		ticket.Status = req.Status
	} else {
		ticket.Status = "answered"
	}

	if err := h.db.DB.Save(&ticket).Error; err != nil {
		log.Error().Err(err).Msg("Failed to update ticket")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}
