package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"ecommerce-backend/internal/config"

	"github.com/gin-gonic/gin"
)

type WebhookProxy struct {
	config *config.Config
	client *http.Client
}

func NewWebhookProxy(cfg *config.Config) *WebhookProxy {
	return &WebhookProxy{
		config: cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type LambdaEvent struct {
	HTTPMethod            string            `json:"httpMethod"`
	Path                  string            `json:"path"`
	QueryStringParameters map[string]string `json:"queryStringParameters"`
	Headers               map[string]string `json:"headers"`
	Body                  string            `json:"body"`
	IsBase64Encoded       bool              `json:"isBase64Encoded"`
}

type LambdaResponse struct {
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

func (wp *WebhookProxy) ProxyToLambda(c *gin.Context) {
	if !wp.config.UseWebhookLambda || wp.config.LambdaWebhookURL == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Lambda webhook not configured",
		})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	queryParams := make(map[string]string)
	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			queryParams[key] = values[0]
		}
	}

	headers := make(map[string]string)
	for key, values := range c.Request.Header {
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}

	lambdaEvent := LambdaEvent{
		HTTPMethod:            c.Request.Method,
		Path:                  c.Request.URL.Path,
		QueryStringParameters: queryParams,
		Headers:               headers,
		Body:                  string(body),
		IsBase64Encoded:       false,
	}

	eventJSON, err := json.Marshal(lambdaEvent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal event"})
		return
	}

	req, err := http.NewRequest("POST", wp.config.LambdaWebhookURL, bytes.NewBuffer(eventJSON))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "EcommerceApp-WebhookProxy/1.0")

	resp, err := wp.client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to contact Lambda function"})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to read Lambda response"})
		return
	}

	var lambdaResp LambdaResponse
	if err := json.Unmarshal(respBody, &lambdaResp); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Invalid Lambda response format"})
		return
	}

	for key, value := range lambdaResp.Headers {
		c.Header(key, value)
	}

	c.Data(lambdaResp.StatusCode, "application/json", []byte(lambdaResp.Body))
}

func (wp *WebhookProxy) HandleVNPayWebhook(c *gin.Context) {
	if wp.config.UseWebhookLambda && wp.config.LambdaWebhookURL != "" {
		wp.ProxyToLambda(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Webhook processed locally",
		"note":    "Lambda processing is disabled",
	})
}
