package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"
	"xray-vpn-connect/internal/models"
	"xray-vpn-connect/internal/queue"
	"xray-vpn-connect/internal/services"
	"xray-vpn-connect/internal/services/xray"
)

func main() {
	// Setup logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("APP_ENV") == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load config")
	}

	// Initialize database
	db, err := database.New(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	// Initialize RabbitMQ
	q, err := queue.New(cfg.RabbitMQ.URL, cfg.RabbitMQ.Exchange)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to RabbitMQ")
	}
	defer q.Close()

	// Initialize panel service
	panelService := services.NewXrayPanelService(db)

	// Task handler
	handler := func(task queue.Task) error {
		log.Info().
			Str("type", task.Type).
			Str("user_id", task.UserID.String()).
			Msg("Processing task")

		switch task.Type {
		case queue.TaskCreateConnection:
			return handleCreateConnection(db, task, panelService)
		case queue.TaskDeleteConnection:
			return handleDeleteConnection(db, task, panelService)
		case queue.TaskUpdateTraffic:
			return handleUpdateTraffic(db, task)
		default:
			log.Warn().Str("type", task.Type).Msg("Unknown task type")
			return nil
		}
	}

	// Start consuming tasks
	if err := q.ConsumeTasks("tasks", handler); err != nil {
		log.Fatal().Err(err).Msg("Failed to start consuming tasks")
	}

	log.Info().Msg("Worker started, consuming tasks...")

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down worker...")
}

func handleCreateConnection(db *database.DB, task queue.Task, panelService *services.XrayPanelService) error {
	// Get connection
	var connection models.Connection
	if err := db.Preload("Server").Preload("User").First(&connection, "id = ?", task.ConnectionID).Error; err != nil {
		return fmt.Errorf("connection not found: %w", err)
	}

	// Get server's Xray panel
	var server models.Server
	if err := db.Preload("XrayPanel").First(&server, "id = ?", connection.ServerID).Error; err != nil {
		return fmt.Errorf("server not found: %w", err)
	}

	// Get panel from database
	panel, err := panelService.GetPanelByServerID(server.ID)
	if err != nil {
		return fmt.Errorf("failed to get panel: %w", err)
	}

	if !panel.IsActive {
		return fmt.Errorf("panel is not active")
	}

	// Create Xray client
	client := xray.NewClient(panel.URL, panel.Username, panel.Password)

	// Generate UUID for connection
	clientUUID := uuid.New().String()
	
	// Calculate expiry time
	var expiryTime int64
	if connection.ExpiresAt != nil {
		expiryTime = connection.ExpiresAt.Unix() * 1000
	} else {
		// Default to 30 days
		expiryTime = time.Now().AddDate(0, 0, 30).Unix() * 1000
	}

	// Email format: user_<user_id>_<connection_id>
	email := fmt.Sprintf("user_%s_%s", connection.UserID.String(), connection.ID.String())

	// Determine inbound ID
	var inboundID int
	if server.InboundID > 0 {
		inboundID = server.InboundID
	} else if panel.InboundID > 0 {
		inboundID = panel.InboundID
	} else {
		inboundID = 1 // default
	}

	// Add client to Xray panel
	clientID, err := client.AddClient(
		inboundID,
		email,
		clientUUID,
		expiryTime,
		0, // unlimited traffic
	)
	if err != nil {
		return fmt.Errorf("failed to add client to Xray: %w", err)
	}

	// Generate connection key
	connectionKey := xray.GenerateConnectionKey(
		server.Protocol,
		clientUUID,
		"your-server-host", // This should come from server config
		443,
		fmt.Sprintf("%s-User", server.Country),
	)

	// Update connection with Xray IDs and key
	connection.XrayClientID = clientID
	connection.ConnectionKey = connectionKey
	connection.SubscriptionLink = fmt.Sprintf("https://api.xray-service.io/sub/%s", connection.ID.String())

	if err := db.Save(&connection).Error; err != nil {
		return fmt.Errorf("failed to update connection: %w", err)
	}

	log.Info().
		Str("connection_id", connection.ID.String()).
		Str("client_id", fmt.Sprintf("%d", clientID)).
		Msg("Connection created in Xray panel")

	return nil
}

func handleDeleteConnection(db *database.DB, task queue.Task, panelService *services.XrayPanelService) error {
	// Get connection
	var connection models.Connection
	if err := db.Preload("Server").Preload("Server.XrayPanel").First(&connection, "id = ?", task.ConnectionID).Error; err != nil {
		return fmt.Errorf("connection not found: %w", err)
	}

	if connection.XrayClientID == 0 {
		log.Warn().Str("connection_id", connection.ID.String()).Msg("Connection has no Xray client ID")
		return nil
	}

	// Get panel from database
	panel, err := panelService.GetPanelByServerID(connection.ServerID)
	if err != nil {
		return fmt.Errorf("failed to get panel: %w", err)
	}

	// Create Xray client
	client := xray.NewClient(panel.URL, panel.Username, panel.Password)

	// Email format
	email := fmt.Sprintf("user_%s_%s", connection.UserID.String(), connection.ID.String())

	// Delete client from Xray panel
	var inboundID int
	if connection.Server.InboundID > 0 {
		inboundID = connection.Server.InboundID
	} else if connection.Server.XrayPanel.InboundID > 0 {
		inboundID = connection.Server.XrayPanel.InboundID
	} else if panel.InboundID > 0 {
		inboundID = panel.InboundID
	} else {
		inboundID = 1 // default
	}

	if err := client.DeleteClient(inboundID, email); err != nil {
		log.Error().Err(err).Msg("Failed to delete client from Xray")
		// Don't fail completely, connection is already marked as deleted in DB
	}

	log.Info().
		Str("connection_id", connection.ID.String()).
		Msg("Connection deleted from Xray panel")

	return nil
}

func handleUpdateTraffic(db *database.DB, task queue.Task) error {
	// Implement traffic update logic
	log.Info().Msg("Traffic update task received")
	return nil
}
