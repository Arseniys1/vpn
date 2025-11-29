package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a Telegram user
type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TelegramID   int64          `gorm:"uniqueIndex;not null" json:"telegram_id"`
	Username     *string        `gorm:"index" json:"username"`
	FirstName    string         `json:"first_name"`
	LastName     *string        `json:"last_name"`
	LanguageCode string         `gorm:"default:'en'" json:"language_code"`
	Balance      int64          `gorm:"default:0" json:"balance"` // Balance in stars
	ReferralCode string         `gorm:"uniqueIndex;not null" json:"referral_code"`
	ReferredBy   *uuid.UUID     `gorm:"type:uuid;index" json:"referred_by"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	IsAdmin      bool           `gorm:"default:false" json:"is_admin"` // Admin role
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Subscription *Subscription   `json:"subscription,omitempty"`
	Referrals    []User          `gorm:"foreignKey:ReferredBy" json:"referrals,omitempty"`
	Connections  []Connection    `json:"connections,omitempty"`
	Tickets      []SupportTicket `json:"tickets,omitempty"`
}

// Plan represents a subscription plan
type Plan struct {
	ID             uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name           string    `gorm:"not null" json:"name"`
	DurationMonths int       `gorm:"not null" json:"duration_months"`
	PriceStars     int64     `gorm:"not null" json:"price_stars"`
	Discount       *string   `json:"discount,omitempty"`
	IsActive       bool      `gorm:"default:true" json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// Relations
	Subscriptions []Subscription `json:"subscriptions,omitempty"`
}

// Subscription represents user subscription
type Subscription struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	PlanID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"plan_id"`
	IsActive  bool       `gorm:"default:false;index" json:"is_active"`
	StartedAt *time.Time `json:"started_at,omitempty"`
	ExpiresAt *time.Time `gorm:"index" json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Plan Plan `gorm:"foreignKey:PlanID" json:"plan,omitempty"`
}

// Server represents a VPN server location
type Server struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name           string         `gorm:"uniqueIndex;not null" json:"name"`
	Country        string         `gorm:"not null" json:"country"`
	Flag           string         `gorm:"not null" json:"flag"`
	Protocol       string         `gorm:"not null" json:"protocol"`                 // vless, vmess, trojan
	Status         string         `gorm:"default:'online'" json:"status"`           // online, maintenance, crowded
	AdminMessage   *string        `gorm:"type:text" json:"admin_message,omitempty"` // Admin message for users
	XrayPanelID    uuid.UUID      `gorm:"type:uuid;index" json:"xray_panel_id"`     // Reference to XrayPanel
	InboundID      int            `json:"inbound_id"`
	MaxConnections int            `gorm:"default:1000" json:"max_connections"`
	CurrentLoad    int            `gorm:"default:0" json:"current_load"`
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	XrayPanel   XrayPanel    `gorm:"foreignKey:XrayPanelID" json:"xray_panel,omitempty"`
	Connections []Connection `json:"connections,omitempty"`
}

// XrayPanel represents an Xray control panel (3x-ui, v2board, etc.)
type XrayPanel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	Type      string         `gorm:"not null" json:"type"` // 3x-ui, v2board
	URL       string         `gorm:"not null" json:"url"`
	Username  string         `gorm:"not null" json:"username"`
	Password  string         `gorm:"not null" json:"password"`
	InboundID int            `json:"inbound_id"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Servers []Server `json:"servers,omitempty"`
}

// Connection represents a user's VPN connection
type Connection struct {
	ID               uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID           uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	ServerID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"server_id"`
	XrayInboundID    int            `json:"xray_inbound_id"`                      // ID in Xray panel
	XrayClientID     int            `json:"xray_client_id"`                       // Client ID in Xray panel
	ConnectionKey    string         `gorm:"not null;index" json:"connection_key"` // vless://... or vmess://...
	SubscriptionLink string         `json:"subscription_link,omitempty"`
	IsActive         bool           `gorm:"default:true;index" json:"is_active"`
	TrafficUsed      int64          `gorm:"default:0" json:"traffic_used"` // bytes
	TrafficLimit     int64          `json:"traffic_limit"`                 // bytes, 0 = unlimited
	ExpiresAt        *time.Time     `gorm:"index" json:"expires_at,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Server Server `gorm:"foreignKey:ServerID" json:"server,omitempty"`
}

// SupportTicket represents a support ticket
type SupportTicket struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Subject    string         `gorm:"not null" json:"subject"`
	Message    string         `gorm:"type:text;not null" json:"message"`
	Category   string         `gorm:"not null" json:"category"`           // connection, payment, other
	Status     string         `gorm:"default:'open';index" json:"status"` // open, answered, closed
	AdminReply *string        `gorm:"type:text" json:"admin_reply,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User     User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Messages []TicketMessage `json:"messages,omitempty"`
}

// TicketMessage represents a message in a support ticket
type TicketMessage struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TicketID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"ticket_id"`
	UserID    uuid.UUID      `gorm:"type:uuid;index" json:"user_id"`
	IsAdmin   bool           `gorm:"default:false" json:"is_admin"`
	Message   string         `gorm:"type:text;not null" json:"message"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Ticket SupportTicket `gorm:"foreignKey:TicketID" json:"ticket,omitempty"`
}

// ServerReport represents a problem report for a server
type ServerReport struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	ServerID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"server_id"`
	OS          string         `gorm:"not null" json:"os"`
	Provider    string         `json:"provider,omitempty"`
	Region      string         `json:"region,omitempty"`
	Description string         `gorm:"type:text;not null" json:"description"`
	Status      string         `gorm:"default:'open'" json:"status"` // open, reviewing, resolved
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Server Server `gorm:"foreignKey:ServerID" json:"server,omitempty"`
}

// ReferralStats tracks referral statistics
type ReferralStats struct {
	ID              uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID          uuid.UUID `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	TotalReferrals  int       `gorm:"default:0" json:"total_referrals"`
	ActiveReferrals int       `gorm:"default:0" json:"active_referrals"`
	RewardEarned    int64     `gorm:"default:0" json:"reward_earned"` // stars
	LastUpdated     time.Time `json:"last_updated"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// QueueTask represents a task in the queue
type QueueTask struct {
	Type         string                 `json:"type"` // create_connection, delete_connection, update_traffic
	UserID       uuid.UUID              `json:"user_id"`
	ServerID     uuid.UUID              `json:"server_id,omitempty"`
	ConnectionID uuid.UUID              `json:"connection_id,omitempty"`
	Data         map[string]interface{} `json:"data,omitempty"`
}

// BeforeCreate hook for User
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	if u.ReferralCode == "" {
		u.ReferralCode = generateReferralCode()
	}
	return nil
}

// generateReferralCode generates a unique referral code
func generateReferralCode() string {
	return uuid.New().String()[:8]
}
