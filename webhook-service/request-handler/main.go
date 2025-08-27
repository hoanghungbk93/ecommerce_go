package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/streadway/amqp"
)

type WebhookRequest struct {
	OrderID       string  `json:"order_id" binding:"required"`
	TransactionID string  `json:"transaction_id" binding:"required"`
	Amount        float64 `json:"amount" binding:"required"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status" binding:"required"`
	PaymentMethod string  `json:"payment_method"`
	Timestamp     int64   `json:"timestamp"`
	Signature     string  `json:"signature"`
	EventType     string  `json:"event_type"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

type WebhookResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	RequestID string `json:"request_id,omitempty"`
	EventID   string `json:"event_id,omitempty"`
}

type Handler struct {
	rabbitmq      *amqp.Connection
	channel       *amqp.Channel
	webhookSecret string
}

var startTime = time.Now()

func main() {
	serviceName := getEnv("SERVICE_NAME", "request-handler")
	port := getEnv("PORT", "8081")
	rabbitmqURL := getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
	webhookSecret := getEnv("WEBHOOK_SECRET", "default-secret-change-me")

	// Retry RabbitMQ connection
	var conn *amqp.Connection
	var err error
	for i := 0; i < 30; i++ {
		conn, err = amqp.Dial(rabbitmqURL)
		if err != nil {
			log.Printf("Waiting for RabbitMQ to be ready... attempt %d/30: %v", i+1, err)
			time.Sleep(2 * time.Second)
			continue
		}
		log.Println("RabbitMQ connection established")
		break
	}
	
	if conn == nil {
		log.Fatal("Failed to connect to RabbitMQ after retries")
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatal("Failed to open a channel:", err)
	}
	defer ch.Close()

	if err := setupRabbitMQ(ch); err != nil {
		log.Fatal("Failed to setup RabbitMQ:", err)
	}

	handler := &Handler{
		rabbitmq:      conn,
		channel:       ch,
		webhookSecret: webhookSecret,
	}

	router := gin.Default()
	router.Use(handler.requestLogger())
	router.Use(handler.recoveryMiddleware())

	v1 := router.Group("/api/v1")
	{
		v1.POST("/webhooks/payment", handler.handlePaymentWebhook)
		v1.GET("/health", handler.handleHealth)
		v1.GET("/metrics", handler.handleMetrics)
	}

	router.GET("/health", handler.handleHealth)

	log.Printf("%s starting on port %s", serviceName, port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func (h *Handler) handlePaymentWebhook(c *gin.Context) {
	startTime := time.Now()
	requestID := c.GetHeader("X-Request-ID")
	if requestID == "" {
		requestID = generateRequestID()
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Failed to read request body: %v", err)
		c.JSON(http.StatusBadRequest, WebhookResponse{
			Success:   false,
			Message:   "Failed to read request body",
			RequestID: requestID,
		})
		return
	}

	signature := c.GetHeader("X-Webhook-Signature")
	if signature == "" {
		signature = c.GetHeader("X-Signature")
	}

	if !h.verifySignature(body, signature) {
		log.Printf("Invalid signature for request %s", requestID)
		c.JSON(http.StatusUnauthorized, WebhookResponse{
			Success:   false,
			Message:   "Invalid signature",
			RequestID: requestID,
		})
		return
	}

	var webhook WebhookRequest
	if err := json.Unmarshal(body, &webhook); err != nil {
		log.Printf("Failed to parse webhook payload: %v", err)
		c.JSON(http.StatusBadRequest, WebhookResponse{
			Success:   false,
			Message:   "Invalid JSON payload",
			RequestID: requestID,
		})
		return
	}

	if webhook.Currency == "" {
		webhook.Currency = "VND"
	}
	if webhook.Timestamp == 0 {
		webhook.Timestamp = time.Now().Unix()
	}

	eventID := generateEventID(webhook.OrderID, webhook.TransactionID)

	if err := h.validateWebhookData(webhook); err != nil {
		log.Printf("Webhook validation failed for request %s: %v", requestID, err)
		c.JSON(http.StatusBadRequest, WebhookResponse{
			Success:   false,
			Message:   fmt.Sprintf("Validation error: %v", err),
			RequestID: requestID,
			EventID:   eventID,
		})
		return
	}

	message := map[string]interface{}{
		"event_id":       eventID,
		"request_id":     requestID,
		"order_id":       webhook.OrderID,
		"transaction_id": webhook.TransactionID,
		"amount":         webhook.Amount,
		"currency":       webhook.Currency,
		"status":         webhook.Status,
		"payment_method": webhook.PaymentMethod,
		"event_type":     webhook.EventType,
		"timestamp":      webhook.Timestamp,
		"metadata":       webhook.Metadata,
		"raw_payload":    string(body),
		"signature":      signature,
		"processed_at":   time.Now().Unix(),
	}

	messageBody, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		c.JSON(http.StatusInternalServerError, WebhookResponse{
			Success:   false,
			Message:   "Internal server error",
			RequestID: requestID,
			EventID:   eventID,
		})
		return
	}

	routingKey := fmt.Sprintf("webhook.payment.%s", webhook.Status)
	
	err = h.channel.Publish(
		"webhook_exchange",
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         messageBody,
			DeliveryMode: amqp.Persistent,
			MessageId:    eventID,
			Timestamp:    time.Now(),
			Headers: amqp.Table{
				"request_id":     requestID,
				"event_type":     webhook.EventType,
				"order_id":       webhook.OrderID,
				"transaction_id": webhook.TransactionID,
				"amount":         webhook.Amount,
				"status":         webhook.Status,
			},
		},
	)

	if err != nil {
		log.Printf("Failed to publish message: %v", err)
		c.JSON(http.StatusInternalServerError, WebhookResponse{
			Success:   false,
			Message:   "Failed to process webhook",
			RequestID: requestID,
			EventID:   eventID,
		})
		return
	}

	processingTime := time.Since(startTime)
	log.Printf("Successfully processed webhook %s in %v", eventID, processingTime)

	c.JSON(http.StatusOK, WebhookResponse{
		Success:   true,
		Message:   "Webhook processed successfully",
		RequestID: requestID,
		EventID:   eventID,
	})
}

func (h *Handler) handleHealth(c *gin.Context) {
	uptime := time.Since(startTime)
	
	rabbitMQStatus := "healthy"
	if h.rabbitmq.IsClosed() {
		rabbitMQStatus = "unhealthy"
	}

	response := map[string]interface{}{
		"status":    "healthy",
		"service":   getEnv("SERVICE_NAME", "request-handler"),
		"timestamp": time.Now(),
		"uptime":    uptime.String(),
		"metrics": map[string]string{
			"rabbitmq_status": rabbitMQStatus,
		},
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) handleMetrics(c *gin.Context) {
	// Return Prometheus format metrics
	response := `# HELP webhook_requests_processed_total Total number of processed webhook requests
# TYPE webhook_requests_processed_total counter
webhook_requests_processed_total 0

# HELP webhook_requests_failed_total Total number of failed webhook requests
# TYPE webhook_requests_failed_total counter
webhook_requests_failed_total 0

# HELP webhook_processing_time_ms Average webhook processing time
# TYPE webhook_processing_time_ms gauge
webhook_processing_time_ms 0

# HELP webhook_queue_depth Current queue depth
# TYPE webhook_queue_depth gauge
webhook_queue_depth 0
`

	c.Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	c.String(http.StatusOK, response)
}

func (h *Handler) verifySignature(body []byte, signature string) bool {
	if signature == "" {
		return false
	}

	expectedSignature := h.generateSignature(body)
	
	if strings.HasPrefix(signature, "sha256=") {
		signature = strings.TrimPrefix(signature, "sha256=")
	}
	
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

func (h *Handler) generateSignature(payload []byte) string {
	mac := hmac.New(sha256.New, []byte(h.webhookSecret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func (h *Handler) validateWebhookData(webhook WebhookRequest) error {
	if webhook.OrderID == "" {
		return fmt.Errorf("order_id is required")
	}
	if webhook.TransactionID == "" {
		return fmt.Errorf("transaction_id is required")
	}
	if webhook.Amount <= 0 {
		return fmt.Errorf("amount must be greater than 0")
	}
	if webhook.Status == "" {
		return fmt.Errorf("status is required")
	}

	validStatuses := []string{"pending", "completed", "failed", "cancelled", "refunded"}
	valid := false
	for _, status := range validStatuses {
		if webhook.Status == status {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("invalid status: %s", webhook.Status)
	}

	return nil
}

func (h *Handler) requestLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP,
			param.TimeStamp.Format(time.RFC1123),
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	})
}

func (h *Handler) recoveryMiddleware() gin.HandlerFunc {
	return gin.RecoveryWithWriter(gin.DefaultWriter, func(c *gin.Context, recovered interface{}) {
		if err, ok := recovered.(string); ok {
			log.Printf("Panic recovered: %s", err)
		}
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
	})
}

func setupRabbitMQ(ch *amqp.Channel) error {
	if err := ch.ExchangeDeclare(
		"webhook_exchange",
		"topic",
		true,
		false,
		false,
		false,
		nil,
	); err != nil {
		return fmt.Errorf("failed to declare exchange: %v", err)
	}

	queues := []string{
		"webhook_payment_pending",
		"webhook_payment_completed",
		"webhook_payment_failed",
		"webhook_payment_cancelled",
		"webhook_payment_refunded",
	}

	for _, queueName := range queues {
		_, err := ch.QueueDeclare(
			queueName,
			true,
			false,
			false,
			false,
			nil,
		)
		if err != nil {
			return fmt.Errorf("failed to declare queue %s: %v", queueName, err)
		}

		status := strings.TrimPrefix(queueName, "webhook_payment_")
		routingKey := fmt.Sprintf("webhook.payment.%s", status)
		
		err = ch.QueueBind(
			queueName,
			routingKey,
			"webhook_exchange",
			false,
			nil,
		)
		if err != nil {
			return fmt.Errorf("failed to bind queue %s: %v", queueName, err)
		}
	}

	return nil
}

func generateEventID(orderID, transactionID string) string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("%s_%s_%d", orderID, transactionID, time.Now().UnixNano())))
	return hex.EncodeToString(hash[:])[:16]
}

func generateRequestID() string {
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), os.Getpid())
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
