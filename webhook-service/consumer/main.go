package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/streadway/amqp"
)

type Consumer struct {
	db            *sql.DB
	rabbitmq      *amqp.Connection
	channel       *amqp.Channel
	webhookSecret string
	serviceName   string
	mu            sync.RWMutex
	metrics       ConsumerMetrics
}

type ConsumerMetrics struct {
	ProcessedCount int64 `json:"processed_count"`
	FailedCount    int64 `json:"failed_count"`
	LastProcessed  int64 `json:"last_processed"`
	StartTime      int64 `json:"start_time"`
}

type WebhookMessage struct {
	EventID       string                 `json:"event_id"`
	RequestID     string                 `json:"request_id"`
	OrderID       string                 `json:"order_id"`
	TransactionID string                 `json:"transaction_id"`
	Amount        float64                `json:"amount"`
	Currency      string                 `json:"currency"`
	Status        string                 `json:"status"`
	PaymentMethod string                 `json:"payment_method"`
	EventType     string                 `json:"event_type"`
	Timestamp     int64                  `json:"timestamp"`
	Metadata      map[string]interface{} `json:"metadata"`
	RawPayload    string                 `json:"raw_payload"`
	Signature     string                 `json:"signature"`
	ProcessedAt   int64                  `json:"processed_at"`
}

type ProcessingResult struct {
	EventID        string `json:"event_id"`
	Success        bool   `json:"success"`
	ErrorMessage   string `json:"error_message,omitempty"`
	ProcessingTime int64  `json:"processing_time_ms"`
}

var startTime = time.Now()

func main() {
	serviceName := getEnv("SERVICE_NAME", "consumer")
	rabbitmqURL := getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
	databaseURL := getEnv("DATABASE_URL", "postgres://admin:password@localhost:5432/webhook_db?sslmode=disable")
	webhookSecret := getEnv("WEBHOOK_SECRET", "default-secret-change-me")

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Retry database connection
	for i := 0; i < 30; i++ {
		if err := db.Ping(); err != nil {
			log.Printf("Waiting for database to be ready... attempt %d/30", i+1)
			time.Sleep(2 * time.Second)
			continue
		}
		log.Println("Database connection established")
		break
	}

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to connect to database after retries:", err)
	}

	// Retry RabbitMQ connection
	var conn *amqp.Connection
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

	consumer := &Consumer{
		db:            db,
		rabbitmq:      conn,
		channel:       ch,
		webhookSecret: webhookSecret,
		serviceName:   serviceName,
		metrics: ConsumerMetrics{
			StartTime: time.Now().Unix(),
		},
	}

	if err := consumer.setupConsumers(); err != nil {
		log.Fatal("Failed to setup consumers:", err)
	}

	go consumer.startHTTPServer()

	log.Printf("%s started successfully", serviceName)

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Printf("%s shutting down gracefully", serviceName)
}

func (c *Consumer) setupConsumers() error {
	queues := []string{
		"webhook_payment_pending",
		"webhook_payment_completed",
		"webhook_payment_failed",
		"webhook_payment_cancelled",
		"webhook_payment_refunded",
	}

	for _, queueName := range queues {
		go c.consumeQueue(queueName)
	}

	return nil
}

func (c *Consumer) consumeQueue(queueName string) {
	msgs, err := c.channel.Consume(
		queueName,
		c.serviceName+"_"+queueName,
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("Failed to consume from queue %s: %v", queueName, err)
		return
	}

	log.Printf("Started consuming from queue: %s", queueName)

	for msg := range msgs {
		c.processMessage(msg, queueName)
	}
}

func (c *Consumer) processMessage(delivery amqp.Delivery, queueName string) {
	startTime := time.Now()

	var webhook WebhookMessage
	if err := json.Unmarshal(delivery.Body, &webhook); err != nil {
		log.Printf("Failed to unmarshal message from %s: %v", queueName, err)
		c.incrementFailedCount()
		delivery.Nack(false, false)
		return
	}

	if !c.verifySignature([]byte(webhook.RawPayload), webhook.Signature) {
		log.Printf("Invalid signature for event %s from %s", webhook.EventID, queueName)
		c.incrementFailedCount()
		
		c.logProcessingResult(webhook.EventID, false, "Invalid signature", time.Since(startTime).Milliseconds())
		delivery.Nack(false, false)
		return
	}

	if err := c.processWebhookEvent(webhook); err != nil {
		log.Printf("Failed to process webhook event %s from %s: %v", webhook.EventID, queueName, err)
		c.incrementFailedCount()
		
		c.logProcessingResult(webhook.EventID, false, err.Error(), time.Since(startTime).Milliseconds())

		if delivery.Headers["x-retry-count"] == nil || delivery.Headers["x-retry-count"].(int32) < 3 {
			retryCount := int32(0)
			if delivery.Headers["x-retry-count"] != nil {
				retryCount = delivery.Headers["x-retry-count"].(int32)
			}
			
			time.Sleep(time.Duration(retryCount+1) * 5 * time.Second)
			
			err = c.channel.Publish(
				"webhook_exchange",
				delivery.RoutingKey,
				false,
				false,
				amqp.Publishing{
					ContentType:  "application/json",
					Body:         delivery.Body,
					DeliveryMode: amqp.Persistent,
					Headers: amqp.Table{
						"x-retry-count": retryCount + 1,
					},
				},
			)
			if err != nil {
				log.Printf("Failed to requeue message: %v", err)
			}
		}

		delivery.Nack(false, false)
		return
	}

	c.incrementProcessedCount()
	c.logProcessingResult(webhook.EventID, true, "", time.Since(startTime).Milliseconds())
	
	log.Printf("Successfully processed webhook event %s from %s in %v", webhook.EventID, queueName, time.Since(startTime))
	delivery.Ack(false)
}

func (c *Consumer) processWebhookEvent(webhook WebhookMessage) error {
	tx, err := c.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	var exists bool
	err = tx.QueryRow("SELECT EXISTS(SELECT 1 FROM webhook_events WHERE event_id = $1)", webhook.EventID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check event existence: %v", err)
	}

	if exists {
		log.Printf("Event %s already processed, skipping", webhook.EventID)
		return tx.Commit()
	}

	payloadJSON, _ := json.Marshal(map[string]interface{}{
		"order_id":       webhook.OrderID,
		"transaction_id": webhook.TransactionID,
		"amount":         webhook.Amount,
		"currency":       webhook.Currency,
		"status":         webhook.Status,
		"payment_method": webhook.PaymentMethod,
		"event_type":     webhook.EventType,
		"timestamp":      webhook.Timestamp,
		"metadata":       webhook.Metadata,
	})

	_, err = tx.Exec(`
		INSERT INTO webhook_events 
		(event_id, order_id, transaction_id, amount, currency, status, signature, payload, processed_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		webhook.EventID,
		webhook.OrderID,
		webhook.TransactionID,
		webhook.Amount,
		webhook.Currency,
		webhook.Status,
		webhook.Signature,
		string(payloadJSON),
		time.Now(),
		time.Unix(webhook.Timestamp, 0),
	)
	if err != nil {
		return fmt.Errorf("failed to insert webhook event: %v", err)
	}

	if err := c.processBusinessLogic(tx, webhook); err != nil {
		return fmt.Errorf("failed to process business logic: %v", err)
	}

	return tx.Commit()
}

func (c *Consumer) processBusinessLogic(tx *sql.Tx, webhook WebhookMessage) error {
	switch webhook.Status {
	case "completed":
		return c.handlePaymentCompleted(tx, webhook)
	case "failed":
		return c.handlePaymentFailed(tx, webhook)
	case "cancelled":
		return c.handlePaymentCancelled(tx, webhook)
	case "refunded":
		return c.handlePaymentRefunded(tx, webhook)
	case "pending":
		return c.handlePaymentPending(tx, webhook)
	default:
		log.Printf("Unknown payment status: %s for event %s", webhook.Status, webhook.EventID)
		return nil
	}
}

func (c *Consumer) handlePaymentCompleted(tx *sql.Tx, webhook WebhookMessage) error {
	log.Printf("Processing completed payment for order %s, transaction %s, amount %.2f %s",
		webhook.OrderID, webhook.TransactionID, webhook.Amount, webhook.Currency)

	return nil
}

func (c *Consumer) handlePaymentFailed(tx *sql.Tx, webhook WebhookMessage) error {
	log.Printf("Processing failed payment for order %s, transaction %s",
		webhook.OrderID, webhook.TransactionID)

	return nil
}

func (c *Consumer) handlePaymentCancelled(tx *sql.Tx, webhook WebhookMessage) error {
	log.Printf("Processing cancelled payment for order %s, transaction %s",
		webhook.OrderID, webhook.TransactionID)

	return nil
}

func (c *Consumer) handlePaymentRefunded(tx *sql.Tx, webhook WebhookMessage) error {
	log.Printf("Processing refunded payment for order %s, transaction %s, amount %.2f %s",
		webhook.OrderID, webhook.TransactionID, webhook.Amount, webhook.Currency)

	return nil
}

func (c *Consumer) handlePaymentPending(tx *sql.Tx, webhook WebhookMessage) error {
	log.Printf("Processing pending payment for order %s, transaction %s",
		webhook.OrderID, webhook.TransactionID)

	return nil
}

func (c *Consumer) verifySignature(payload []byte, signature string) bool {
	if signature == "" {
		return false
	}

	expectedSignature := c.generateSignature(payload)
	
	if strings.HasPrefix(signature, "sha256=") {
		signature = strings.TrimPrefix(signature, "sha256=")
	}
	
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

func (c *Consumer) generateSignature(payload []byte) string {
	mac := hmac.New(sha256.New, []byte(c.webhookSecret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func (c *Consumer) logProcessingResult(eventID string, success bool, errorMsg string, processingTimeMs int64) {
	status := "success"
	if !success {
		status = "failed"
	}

	_, err := c.db.Exec(`
		INSERT INTO webhook_processing_log 
		(event_id, service_name, processing_status, error_message, processing_time_ms, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		eventID, c.serviceName, status, errorMsg, processingTimeMs, time.Now(),
	)
	if err != nil {
		log.Printf("Failed to log processing result: %v", err)
	}
}

func (c *Consumer) incrementProcessedCount() {
	c.mu.Lock()
	c.metrics.ProcessedCount++
	c.metrics.LastProcessed = time.Now().Unix()
	c.mu.Unlock()
}

func (c *Consumer) incrementFailedCount() {
	c.mu.Lock()
	c.metrics.FailedCount++
	c.mu.Unlock()
}

func (c *Consumer) getMetrics() ConsumerMetrics {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.metrics
}

func (c *Consumer) startHTTPServer() {
	router := gin.Default()
	
	router.GET("/health", c.handleHealth)
	router.GET("/metrics", c.handleMetrics)

	port := getEnv("HTTP_PORT", "8082")
	log.Printf("Starting HTTP server on port %s", port)
	
	if err := router.Run(":" + port); err != nil {
		log.Printf("Failed to start HTTP server: %v", err)
	}
}

func (c *Consumer) handleHealth(ctx *gin.Context) {
	uptime := time.Since(startTime)
	
	dbStatus := "healthy"
	if err := c.db.Ping(); err != nil {
		dbStatus = "unhealthy"
	}

	rabbitMQStatus := "healthy"
	if c.rabbitmq.IsClosed() {
		rabbitMQStatus = "unhealthy"
	}

	response := map[string]interface{}{
		"status":    "healthy",
		"service":   c.serviceName,
		"timestamp": time.Now(),
		"uptime":    uptime.String(),
		"metrics": map[string]string{
			"database_status": dbStatus,
			"rabbitmq_status": rabbitMQStatus,
		},
	}

	ctx.JSON(http.StatusOK, response)
}

func (c *Consumer) handleMetrics(ctx *gin.Context) {
	metrics := c.getMetrics()
	
	// Return Prometheus format metrics
	response := fmt.Sprintf(`# HELP webhook_messages_processed_total Total number of processed webhook messages
# TYPE webhook_messages_processed_total counter
webhook_messages_processed_total %d

# HELP webhook_messages_failed_total Total number of failed webhook messages
# TYPE webhook_messages_failed_total counter
webhook_messages_failed_total %d

# HELP webhook_last_processed_timestamp Last processed message timestamp
# TYPE webhook_last_processed_timestamp gauge
webhook_last_processed_timestamp %d

# HELP webhook_consumer_start_time Consumer start time
# TYPE webhook_consumer_start_time gauge
webhook_consumer_start_time %d
`,
		metrics.ProcessedCount,
		metrics.FailedCount,
		metrics.LastProcessed,
		metrics.StartTime,
	)
	
	ctx.Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	ctx.String(http.StatusOK, response)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
