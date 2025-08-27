package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

type Gateway struct {
	redis           *redis.Client
	requestHandlers []string
	currentHandler  int
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Service   string            `json:"service"`
	Timestamp time.Time         `json:"timestamp"`
	Uptime    time.Duration     `json:"uptime"`
	Metrics   map[string]string `json:"metrics"`
}

type RateLimitInfo struct {
	Requests int       `json:"requests"`
	Window   time.Time `json:"window"`
}

var startTime = time.Now()

func main() {
	serviceName := getEnv("SERVICE_NAME", "api-gateway")
	port := getEnv("PORT", "8080")
	redisURL := getEnv("REDIS_URL", "redis://localhost:6379")
	handlerURLs := getEnv("WEBHOOK_HANDLER_URL", "http://localhost:8081")

	rdb := redis.NewClient(&redis.Options{
		Addr: strings.TrimPrefix(redisURL, "redis://"),
	})

	handlers := strings.Split(handlerURLs, ",")
	for i, handler := range handlers {
		handlers[i] = strings.TrimSpace(handler)
	}

	gateway := &Gateway{
		redis:           rdb,
		requestHandlers: handlers,
		currentHandler:  0,
	}

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Webhook-Signature"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	router.Use(gateway.requestLogger())
	router.Use(gateway.rateLimitMiddleware())

	v1 := router.Group("/api/v1")
	{
		v1.POST("/webhooks/payment", gateway.handleWebhook)
		v1.GET("/health", gateway.handleHealth)
		v1.GET("/metrics", gateway.handleMetrics)
	}

	router.GET("/health", gateway.handleHealth)

	log.Printf("%s starting on port %s", serviceName, port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func (g *Gateway) handleWebhook(c *gin.Context) {
	startTime := time.Now()

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

	targetURL := g.getNextHandler()
	target, err := url.Parse(targetURL)
	if err != nil {
		log.Printf("Failed to parse target URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Director = func(req *http.Request) {
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.URL.Path = "/api/v1/webhooks/payment"
		req.Host = target.Host
		
		req.Header.Set("X-Forwarded-For", c.ClientIP())
		req.Header.Set("X-Gateway-Service", getEnv("SERVICE_NAME", "api-gateway"))
		req.Header.Set("X-Request-ID", generateRequestID())
	}

	proxy.ModifyResponse = func(resp *http.Response) error {
		duration := time.Since(startTime)
		resp.Header.Set("X-Processing-Time", duration.String())
		resp.Header.Set("X-Gateway-Service", getEnv("SERVICE_NAME", "api-gateway"))
		
		g.recordMetrics("webhook_request", map[string]interface{}{
			"status_code": resp.StatusCode,
			"duration_ms": duration.Milliseconds(),
			"handler":     targetURL,
		})
		
		return nil
	}

	proxy.ServeHTTP(c.Writer, c.Request)
}

func (g *Gateway) handleHealth(c *gin.Context) {
	uptime := time.Since(startTime)
	
	ctx := context.Background()
	redisStatus := "healthy"
	if err := g.redis.Ping(ctx).Err(); err != nil {
		redisStatus = "unhealthy"
	}

	handlersStatus := make(map[string]string)
	for i, handler := range g.requestHandlers {
		status := g.checkHandlerHealth(handler)
		handlersStatus[fmt.Sprintf("handler_%d", i)] = status
	}

	response := HealthResponse{
		Status:    "healthy",
		Service:   getEnv("SERVICE_NAME", "api-gateway"),
		Timestamp: time.Now(),
		Uptime:    uptime,
		Metrics: map[string]string{
			"redis_status": redisStatus,
		},
	}

	for k, v := range handlersStatus {
		response.Metrics[k] = v
	}

	c.JSON(http.StatusOK, response)
}

func (g *Gateway) handleMetrics(c *gin.Context) {
	ctx := context.Background()
	
	// Return Prometheus format metrics
	response := fmt.Sprintf(`# HELP webhook_requests_total Total number of webhook requests
# TYPE webhook_requests_total counter
webhook_requests_total %v

# HELP webhook_requests_per_minute Requests per minute
# TYPE webhook_requests_per_minute gauge
webhook_requests_per_minute %v

# HELP webhook_avg_response_time_ms Average response time in milliseconds
# TYPE webhook_avg_response_time_ms gauge
webhook_avg_response_time_ms %v

# HELP webhook_error_rate Error rate percentage
# TYPE webhook_error_rate gauge
webhook_error_rate %v
`,
		g.getMetric(ctx, "requests_total"),
		g.getMetric(ctx, "requests_per_min"),
		g.getMetric(ctx, "avg_response_time"),
		g.getMetric(ctx, "error_rate"),
	)
	
	c.Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	c.String(http.StatusOK, response)
}

func (g *Gateway) rateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		
		if g.isRateLimited(clientIP) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"retry_after": 60,
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

func (g *Gateway) requestLogger() gin.HandlerFunc {
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

func (g *Gateway) getNextHandler() string {
	handler := g.requestHandlers[g.currentHandler]
	g.currentHandler = (g.currentHandler + 1) % len(g.requestHandlers)
	return handler
}

func (g *Gateway) isRateLimited(clientIP string) bool {
	ctx := context.Background()
	key := fmt.Sprintf("rate_limit:%s", clientIP)
	
	count, err := g.redis.Incr(ctx, key).Result()
	if err != nil {
		log.Printf("Redis error in rate limiting: %v", err)
		return false
	}
	
	if count == 1 {
		g.redis.Expire(ctx, key, time.Minute)
	}
	
	return count > 100
}

func (g *Gateway) checkHandlerHealth(handlerURL string) string {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(handlerURL + "/health")
	if err != nil {
		return "unhealthy"
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == http.StatusOK {
		return "healthy"
	}
	return "unhealthy"
}

func (g *Gateway) recordMetrics(metricType string, data map[string]interface{}) {
	ctx := context.Background()
	
	g.redis.Incr(ctx, "requests_total")
	g.redis.Incr(ctx, fmt.Sprintf("requests_%s", time.Now().Format("2006-01-02-15-04")))
	
	if statusCode, ok := data["status_code"].(int); ok {
		if statusCode >= 400 {
			g.redis.Incr(ctx, "error_count")
		}
	}
	
	if duration, ok := data["duration_ms"].(int64); ok {
		g.redis.LPush(ctx, "response_times", duration)
		g.redis.LTrim(ctx, "response_times", 0, 999)
	}
}

func (g *Gateway) getMetric(ctx context.Context, key string) interface{} {
	switch key {
	case "requests_total":
		val, _ := g.redis.Get(ctx, "requests_total").Result()
		if val == "" {
			return 0
		}
		count, _ := strconv.Atoi(val)
		return count
		
	case "requests_per_min":
		currentMinute := fmt.Sprintf("requests_%s", time.Now().Format("2006-01-02-15-04"))
		val, _ := g.redis.Get(ctx, currentMinute).Result()
		if val == "" {
			return 0
		}
		count, _ := strconv.Atoi(val)
		return count
		
	case "avg_response_time":
		times, _ := g.redis.LRange(ctx, "response_times", 0, -1).Result()
		if len(times) == 0 {
			return 0
		}
		
		var sum int64
		for _, timeStr := range times {
			time, _ := strconv.ParseInt(timeStr, 10, 64)
			sum += time
		}
		return sum / int64(len(times))
		
	case "error_rate":
		total, _ := g.redis.Get(ctx, "requests_total").Result()
		errors, _ := g.redis.Get(ctx, "error_count").Result()
		
		totalCount, _ := strconv.Atoi(total)
		errorCount, _ := strconv.Atoi(errors)
		
		if totalCount == 0 {
			return 0.0
		}
		return float64(errorCount) / float64(totalCount) * 100
		
	default:
		return 0
	}
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
