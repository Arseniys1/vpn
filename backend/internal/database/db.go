package database

import (
	"fmt"
	"time"

	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/models"

	"github.com/rs/zerolog/log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DB struct {
	*gorm.DB
}

func New(cfg *config.Config) (*DB, error) {
	dsn := cfg.Database.DSN()

	// Configure GORM logger based on log level
	var gormLogger logger.Interface
	if cfg.App.LogLevel == "debug" {
		gormLogger = logger.Default.LogMode(logger.Info)
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying sql.DB to configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Set connection pool settings for production
	// MaxOpenConns: Maximum number of open connections to the database
	// MaxIdleConns: Maximum number of idle connections in the pool
	// ConnMaxLifetime: Maximum amount of time a connection may be reused
	sqlDB.SetMaxOpenConns(cfg.Database.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.Database.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.Database.ConnMaxLifetime)
	// Set max idle time for connections (good for cloud databases)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info().Msg("Database connection established")

	return &DB{DB: db}, nil
}

func (db *DB) AutoMigrate() error {
	log.Info().Msg("Running database migrations...")

	err := db.DB.AutoMigrate(
		&models.User{},
		&models.Plan{},
		&models.Subscription{},
		&models.Server{},
		&models.XrayPanel{},
		&models.Connection{},
		&models.SupportTicket{},
		&models.TicketMessage{},
		&models.ServerReport{},
		&models.ServerUser{},
		&models.ReferralStats{},
		&models.AuthSession{},
		&models.BrowserSession{},
		&models.Payment{}, // Add the Payment model
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Info().Msg("Database migrations completed successfully")
	return nil
}

func (db *DB) Seed() error {
	log.Info().Msg("Seeding database...")

	// Seed default plans
	plans := []models.Plan{
		{
			Name:           "1 Месяц",
			DurationMonths: 1,
			PriceStars:     100,
			IsActive:       true,
		},
		{
			Name:           "3 Месяца",
			DurationMonths: 3,
			PriceStars:     250,
			Discount:       stringPtr("-15%"),
			IsActive:       true,
		},
		{
			Name:           "1 Год",
			DurationMonths: 12,
			PriceStars:     900,
			Discount:       stringPtr("-25%"),
			IsActive:       true,
		},
	}

	for _, plan := range plans {
		var existing models.Plan
		result := db.DB.Where("name = ?", plan.Name).First(&existing)
		if result.Error == gorm.ErrRecordNotFound {
			if err := db.DB.Create(&plan).Error; err != nil {
				log.Warn().Err(err).Str("plan", plan.Name).Msg("Failed to seed plan")
			} else {
				log.Info().Str("plan", plan.Name).Msg("Seeded plan")
			}
		}
	}

	log.Info().Msg("Database seeding completed")
	return nil
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func stringPtr(s string) *string {
	return &s
}
