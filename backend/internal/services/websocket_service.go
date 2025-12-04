package services

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
	"xray-vpn-connect/internal/models"
)

// WebSocketService handles WebSocket connections and message broadcasting
type WebSocketService struct {
	clients    map[*websocket.Conn]uuid.UUID // Map of connections to user IDs
	broadcast  chan WebSocketMessage
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
	upgrader   websocket.Upgrader
}

// Client represents a WebSocket client connection
type Client struct {
	conn   *websocket.Conn
	userID uuid.UUID
}

// WebSocketMessage represents a message to be sent over WebSocket
type WebSocketMessage struct {
	Type      string      `json:"type"`
	UserID    *uuid.UUID  `json:"user_id,omitempty"` // nil for broadcast to all users
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// NewWebSocketService creates a new WebSocket service
func NewWebSocketService() *WebSocketService {
	return &WebSocketService{
		clients:    make(map[*websocket.Conn]uuid.UUID),
		broadcast:  make(chan WebSocketMessage, 100),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow connections from any origin in development
			},
		},
	}
}

// HandleWebSocket handles WebSocket upgrade requests
func (s *WebSocketService) HandleWebSocket(c *gin.Context) {
	userInterface, _ := c.Get("user")

	user, ok := userInterface.(models.User)
	if !ok {
		log.Error().Msg("Failed to get user from session")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user from session"})
		return
	}

	conn, err := s.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Error().Err(err).Msg("Failed to upgrade connection to WebSocket")
		return
	}
	defer conn.Close()

	client := &Client{
		conn:   conn,
		userID: user.ID,
	}

	// Register client
	s.register <- client

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			log.Debug().Err(err).Msg("WebSocket connection closed")
			s.unregister <- client
			break
		}
	}
}

// BroadcastMessage sends a message to all connected clients or a specific user
func (s *WebSocketService) BroadcastMessage(message WebSocketMessage) {
	s.broadcast <- message
}

// Run starts the WebSocket service message handling loop
func (s *WebSocketService) Run() {
	for {
		select {
		case client := <-s.register:
			s.mutex.Lock()
			s.clients[client.conn] = client.userID
			s.mutex.Unlock()
			log.Info().
				Str("user_id", client.userID.String()).
				Msg("Client registered")

		case client := <-s.unregister:
			s.mutex.Lock()
			if userID, ok := s.clients[client.conn]; ok {
				delete(s.clients, client.conn)
				log.Info().
					Str("user_id", userID.String()).
					Msg("Client unregistered")
			}
			s.mutex.Unlock()

		case message := <-s.broadcast:
			s.mutex.RLock()
			// Send message to appropriate clients
			for conn, userID := range s.clients {
				// If UserID is nil, send to all clients (broadcast)
				// If UserID is specified, send only to that user
				if message.UserID == nil || *message.UserID == userID {
					messageBytes, err := json.Marshal(message)
					if err != nil {
						log.Error().Err(err).Msg("Failed to marshal WebSocket message")
						continue
					}

					// Send message asynchronously to avoid blocking
					go func(connection *websocket.Conn, msg []byte) {
						err := connection.WriteMessage(websocket.TextMessage, msg)
						if err != nil {
							log.Error().Err(err).Msg("Failed to send WebSocket message")
							s.unregister <- &Client{conn: connection}
						}
					}(conn, messageBytes)
				}
			}
			s.mutex.RUnlock()
		}
	}
}
