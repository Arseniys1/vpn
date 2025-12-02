package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"xray-vpn-connect/internal/config"
	"xray-vpn-connect/internal/database"

	"github.com/rs/zerolog/log"
)

// TelegramService handles Telegram bot operations
type TelegramService struct {
	botToken string
}

// NewTelegramService creates a new Telegram service
func NewTelegramService(botToken string) *TelegramService {
	return &TelegramService{
		botToken: botToken,
	}
}

// SetWebhook sets the webhook URL for the Telegram bot
func (ts *TelegramService) SetWebhook(webhookURL string) error {
	if ts.botToken == "" {
		return fmt.Errorf("bot token is not set")
	}

	if webhookURL == "" {
		log.Info().Msg("Webhook URL not set, skipping webhook registration")
		return nil
	}

	// Telegram API endpoint for setting webhook
	url := fmt.Sprintf("https://api.telegram.org/bot%s/setWebhook", ts.botToken)

	// Prepare the request payload
	payload := map[string]interface{}{
		"url": webhookURL,
	}

	// Convert payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var result struct {
		Ok          bool   `json:"ok"`
		Description string `json:"description"`
		Result      bool   `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Ok {
		return fmt.Errorf("Telegram API error: %s", result.Description)
	}

	log.Info().Str("webhook_url", webhookURL).Msg("Telegram webhook set successfully")
	return nil
}

// GetWebhookInfo gets information about the current webhook
func (ts *TelegramService) GetWebhookInfo() (map[string]interface{}, error) {
	if ts.botToken == "" {
		return nil, fmt.Errorf("bot token is not set")
	}

	// Telegram API endpoint for getting webhook info
	url := fmt.Sprintf("https://api.telegram.org/bot%s/getWebhookInfo", ts.botToken)

	// Create HTTP request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result, nil
}

// DeleteWebhook removes the current webhook
func (ts *TelegramService) DeleteWebhook() error {
	if ts.botToken == "" {
		return fmt.Errorf("bot token is not set")
	}

	// Telegram API endpoint for deleting webhook
	url := fmt.Sprintf("https://api.telegram.org/bot%s/deleteWebhook", ts.botToken)

	// Create HTTP request
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var result struct {
		Ok          bool   `json:"ok"`
		Description string `json:"description"`
		Result      bool   `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Ok {
		return fmt.Errorf("Telegram API error: %s", result.Description)
	}

	log.Info().Msg("Telegram webhook deleted successfully")
	return nil
}

// sendTelegramMessage sends a message to a Telegram chat
func (ts *TelegramService) SendTelegramMessage(db *database.DB, cfg *config.Config, chatID int64, text string) {
	// Get bot token from config
	botToken := cfg.Telegram.BotToken
	if botToken == "" {
		log.Error().Msg("TELEGRAM_BOT_TOKEN not set in config")
		return
	}

	// Telegram API endpoint for sending messages
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	// Prepare the request payload
	payload := map[string]interface{}{
		"chat_id": chatID,
		"text":    text,
	}

	// Convert payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal payload")
		return
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Error().Err(err).Msg("Failed to create request")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to send request")
		return
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		log.Error().Int("status_code", resp.StatusCode).Msg("Telegram API returned non-OK status")
	}
}
