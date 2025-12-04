package config

import (
	"fmt"
	"os"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig      `mapstructure:"app"`
	Database DatabaseConfig `mapstructure:"database"`
	RabbitMQ RabbitMQConfig `mapstructure:"rabbitmq"`
	Server   ServerConfig   `mapstructure:"server"`
	Telegram TelegramConfig `mapstructure:"telegram"`
	JWT      JWTConfig      `mapstructure:"jwt"`
}

type AppConfig struct {
	Env         string `mapstructure:"env"`
	Version     string `mapstructure:"version"`
	LogLevel    string `mapstructure:"log_level"`
	ServiceName string `mapstructure:"service_name"`
}

type DatabaseConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	User            string        `mapstructure:"user"`
	Password        string        `mapstructure:"password"`
	DBName          string        `mapstructure:"db_name"`
	SSLMode         string        `mapstructure:"ssl_mode"`
	MaxOpenConns    int           `mapstructure:"max_open_conns"`
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
}

type RabbitMQConfig struct {
	URL         string `mapstructure:"url"`
	Exchange    string `mapstructure:"exchange"`
	QueuePrefix string `mapstructure:"queue_prefix"`
}

type ServerConfig struct {
	Host          string        `mapstructure:"host"`
	Port          int           `mapstructure:"port"`
	WebsocketPort int           `mapstructure:"websocket_port"`
	ReadTimeout   time.Duration `mapstructure:"read_timeout"`
	WriteTimeout  time.Duration `mapstructure:"write_timeout"`
	IdleTimeout   time.Duration `mapstructure:"idle_timeout"`
}

type TelegramConfig struct {
	BotToken    string `mapstructure:"bot_token"`
	WebhookURL  string `mapstructure:"webhook_url"`
	BotUsername string `mapstructure:"bot_username"`
	FrontendURL string `mapstructure:"frontend_url"`
}

type JWTConfig struct {
	Secret     string        `mapstructure:"secret"`
	Expiration time.Duration `mapstructure:"expiration"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath("../configs")
	viper.AddConfigPath("../../configs")

	// Environment variables
	viper.SetEnvPrefix("APP")
	viper.AutomaticEnv()

	// Set defaults
	setDefaults()

	// Read config file (optional, env vars take precedence)
	if err := viper.ReadInConfig(); err != nil {
		// Config file not found, use defaults and env vars
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("error reading config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("error unmarshaling config: %w", err)
	}

	// Override with environment variables
	overrideWithEnv(&config)

	return &config, nil
}

func setDefaults() {
	// App defaults
	viper.SetDefault("app.env", "development")
	viper.SetDefault("app.version", "1.0.0")
	viper.SetDefault("app.log_level", "info")
	viper.SetDefault("app.service_name", "xray-vpn-api")

	// Database defaults
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "postgres")
	viper.SetDefault("database.password", "postgres")
	viper.SetDefault("database.db_name", "xrayvpn")
	viper.SetDefault("database.ssl_mode", "disable")
	viper.SetDefault("database.max_open_conns", 25)
	viper.SetDefault("database.max_idle_conns", 5)
	viper.SetDefault("database.conn_max_lifetime", 300*time.Second)

	// RabbitMQ defaults
	viper.SetDefault("rabbitmq.url", "amqp://guest:guest@localhost:5672/")
	viper.SetDefault("rabbitmq.exchange", "xray_vpn")
	viper.SetDefault("rabbitmq.queue_prefix", "xray_vpn")

	// Server defaults
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.websocket_port", 8081)
	viper.SetDefault("server.read_timeout", 15*time.Second)
	viper.SetDefault("server.write_timeout", 15*time.Second)
	viper.SetDefault("server.idle_timeout", 60*time.Second)

	// JWT defaults
	viper.SetDefault("jwt.secret", "change-me-in-production")
	viper.SetDefault("jwt.expiration", 24*time.Hour)
}

func overrideWithEnv(config *Config) {
	// Support Docker secrets (files)
	if dbPasswordFile := viper.GetString("DB_PASSWORD_FILE"); dbPasswordFile != "" {
		if password, err := readSecretFile(dbPasswordFile); err == nil {
			config.Database.Password = password
		}
	} else if viper.IsSet("DB_PASSWORD") {
		config.Database.Password = viper.GetString("DB_PASSWORD")
	}

	if jwtSecretFile := viper.GetString("JWT_SECRET_FILE"); jwtSecretFile != "" {
		if secret, err := readSecretFile(jwtSecretFile); err == nil {
			config.JWT.Secret = secret
		}
	} else if viper.IsSet("JWT_SECRET") {
		config.JWT.Secret = viper.GetString("JWT_SECRET")
	}

	if telegramTokenFile := viper.GetString("TELEGRAM_BOT_TOKEN_FILE"); telegramTokenFile != "" {
		if token, err := readSecretFile(telegramTokenFile); err == nil {
			config.Telegram.BotToken = token
		}
	} else if viper.IsSet("TELEGRAM_BOT_TOKEN") {
		config.Telegram.BotToken = viper.GetString("TELEGRAM_BOT_TOKEN")
	}

	if viper.IsSet("DB_HOST") {
		config.Database.Host = viper.GetString("DB_HOST")
	}
	if viper.IsSet("DB_PORT") {
		config.Database.Port = viper.GetInt("DB_PORT")
	}
	if viper.IsSet("DB_USER") {
		config.Database.User = viper.GetString("DB_USER")
	}
	if viper.IsSet("DB_NAME") {
		config.Database.DBName = viper.GetString("DB_NAME")
	}
	if viper.IsSet("DB_SSLMODE") {
		config.Database.SSLMode = viper.GetString("DB_SSLMODE")
	}

	if viper.IsSet("RABBITMQ_URL") {
		config.RabbitMQ.URL = viper.GetString("RABBITMQ_URL")
	}

	if viper.IsSet("APP_ENV") {
		config.App.Env = viper.GetString("APP_ENV")
	}
	if viper.IsSet("LOG_LEVEL") {
		config.App.LogLevel = viper.GetString("LOG_LEVEL")
	}

	if viper.IsSet("SERVER_PORT") {
		config.Server.Port = viper.GetInt("SERVER_PORT")
	}

	// Telegram config overrides
	if viper.IsSet("TELEGRAM_BOT_USERNAME") {
		config.Telegram.BotUsername = viper.GetString("TELEGRAM_BOT_USERNAME")
	}
	if viper.IsSet("FRONTEND_URL") {
		config.Telegram.FrontendURL = viper.GetString("FRONTEND_URL")
	}
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode)
}

// readSecretFile reads a secret from a file (for Docker secrets)
func readSecretFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
