package xray

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client for 3x-ui panel API
type Client struct {
	baseURL    string
	username   string
	password   string
	httpClient *http.Client
}

type XrayClient struct {
	ID         int    `json:"id"`
	Email      string `json:"email"`
	UUID       string `json:"uuid,omitempty"`
	Password   string `json:"password,omitempty"`
	TotalGB    int64  `json:"totalGB"`
	ExpiryTime int64  `json:"expiryTime"`
	Enable     bool   `json:"enable"`
}

type XrayInbound struct {
	ID             int          `json:"id"`
	Up             int64        `json:"up"`
	Down           int64        `json:"down"`
	Total          int64        `json:"total"`
	Remark         string       `json:"remark"`
	Enable         bool         `json:"enable"`
	ExpiryTime     int64        `json:"expiryTime"`
	Listen         string       `json:"listen"`
	Port           int          `json:"port"`
	Protocol       string       `json:"protocol"`
	Settings       string       `json:"settings"`
	StreamSettings string       `json:"streamSettings"`
	Sniffing       string       `json:"sniffing"`
	ClientStats    []ClientStat `json:"clientStats"`
	Clients        []XrayClient `json:"clients"`
}

type ClientStat struct {
	ID         int    `json:"id"`
	InboundID  int    `json:"inboundId"`
	Enable     bool   `json:"enable"`
	Email      string `json:"email"`
	Up         int64  `json:"up"`
	Down       int64  `json:"down"`
	Total      int64  `json:"total"`
	ExpiryTime int64  `json:"expiryTime"`
}

type LoginResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg,omitempty"`
}

type InboundListResponse struct {
	Success bool          `json:"success"`
	Obj     []XrayInbound `json:"obj,omitempty"`
	Msg     string        `json:"msg,omitempty"`
}

type InboundResponse struct {
	Success bool        `json:"success"`
	Obj     XrayInbound `json:"obj,omitempty"`
	Msg     string      `json:"msg,omitempty"`
}

type AddClientResponse struct {
	Success bool   `json:"success"`
	Obj     *int   `json:"obj,omitempty"`
	Msg     string `json:"msg,omitempty"`
}

func NewClient(baseURL, username, password string) *Client {
	return &Client{
		baseURL:  baseURL,
		username: username,
		password: password,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true, // For self-signed certificates
				},
			},
		},
	}
}

func (c *Client) Login() (*http.Cookie, error) {
	url := fmt.Sprintf("%s/login", c.baseURL)

	payload := map[string]string{
		"username": c.username,
		"password": c.password,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal login payload: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send login request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("login failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Extract session cookie
	var sessionCookie *http.Cookie
	for _, cookie := range resp.Cookies() {
		if cookie.Name == "session" || cookie.Name == "JSESSIONID" {
			sessionCookie = cookie
			break
		}
	}

	if sessionCookie == nil {
		return nil, fmt.Errorf("session cookie not found in response")
	}

	return sessionCookie, nil
}

func (c *Client) makeAuthenticatedRequest(method, endpoint string, body interface{}) (*http.Response, error) {
	cookie, err := c.Login()
	if err != nil {
		return nil, fmt.Errorf("failed to login: %w", err)
	}

	url := fmt.Sprintf("%s%s", c.baseURL, endpoint)

	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.AddCookie(cookie)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.httpClient.Do(req)
}

func (c *Client) GetInbound(inboundID int) (*XrayInbound, error) {
	resp, err := c.makeAuthenticatedRequest("GET", fmt.Sprintf("/panel/inbound/get/%d", inboundID), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get inbound: status %d, body: %s", resp.StatusCode, string(body))
	}

	var result InboundResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("api returned error: %s", result.Msg)
	}

	return &result.Obj, nil
}

func (c *Client) AddClient(inboundID int, email string, uuid string, expiryTime int64, totalGB int64) (int, error) {
	// First get the inbound to get current clients
	inbound, err := c.GetInbound(inboundID)
	if err != nil {
		return 0, fmt.Errorf("failed to get inbound: %w", err)
	}

	// Add new client to the list
	newClient := XrayClient{
		Email:      email,
		UUID:       uuid,
		TotalGB:    totalGB,
		ExpiryTime: expiryTime,
		Enable:     true,
	}

	inbound.Clients = append(inbound.Clients, newClient)

	// Update inbound with new client
	if err := c.UpdateInbound(inboundID, inbound); err != nil {
		return 0, fmt.Errorf("failed to update inbound: %w", err)
	}

	// Get the updated inbound to get the new client ID
	updatedInbound, err := c.GetInbound(inboundID)
	if err != nil {
		return 0, fmt.Errorf("failed to get updated inbound: %w", err)
	}

	// Find the new client ID (last client should be our new one)
	if len(updatedInbound.Clients) == 0 {
		return 0, fmt.Errorf("client was not created")
	}

	// Return the ID of the last client (newly added)
	return len(updatedInbound.Clients) - 1, nil
}

func (c *Client) UpdateInbound(inboundID int, inbound *XrayInbound) error {
	url := fmt.Sprintf("/panel/inbound/update/%d", inboundID)

	resp, err := c.makeAuthenticatedRequest("POST", url, inbound)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to update inbound: status %d, body: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Success bool   `json:"success"`
		Msg     string `json:"msg,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Success {
		return fmt.Errorf("api returned error: %s", result.Msg)
	}

	return nil
}

func (c *Client) DeleteClient(inboundID int, email string) error {
	inbound, err := c.GetInbound(inboundID)
	if err != nil {
		return fmt.Errorf("failed to get inbound: %w", err)
	}

	// Remove client from list
	var updatedClients []XrayClient
	for _, client := range inbound.Clients {
		if client.Email != email {
			updatedClients = append(updatedClients, client)
		}
	}

	inbound.Clients = updatedClients

	// Update inbound
	if err := c.UpdateInbound(inboundID, inbound); err != nil {
		return fmt.Errorf("failed to update inbound: %w", err)
	}

	return nil
}

func (c *Client) GetClientStats(inboundID int) ([]ClientStat, error) {
	resp, err := c.makeAuthenticatedRequest("GET", fmt.Sprintf("/panel/inbound/getClientTraffics/%s", "email"), nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get client stats: status %d, body: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Success bool         `json:"success"`
		Obj     []ClientStat `json:"obj,omitempty"`
		Msg     string       `json:"msg,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("api returned error: %s", result.Msg)
	}

	return result.Obj, nil
}

// GenerateConnectionKey generates a connection key based on protocol and client info
func GenerateConnectionKey(protocol, uuid, serverHost string, port int, remark string) string {
	baseKey := fmt.Sprintf("%s://%s@%s:%d", protocol, uuid, serverHost, port)

	switch protocol {
	case "vless":
		return fmt.Sprintf("%s?security=reality&type=tcp&headerType=none#%s", baseKey, remark)
	case "vmess":
		return baseKey // VMess format is different, simplified here
	case "trojan":
		return fmt.Sprintf("%s?security=tls#%s", baseKey, remark)
	default:
		return baseKey
	}
}
