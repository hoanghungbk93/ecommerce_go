package config

import (
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL   string
	JWTSecret     string
	Port          string
	VNPayTMNCode  string
	VNPayHashKey  string
	VNPayURL      string
	VNPayReturnURL string
	Environment   string
	Debug         bool
	CORSOrigins   []string
	TaxRate       float64
	ShippingCost  float64
	SMTPHost      string
	SMTPPort      string
	SMTPUser      string
	SMTPPassword  string
	UploadPath    string
	BaseURL       string
}

func Load() *Config {
	debug, _ := strconv.ParseBool(getEnv("DEBUG", "false"))
	taxRate, _ := strconv.ParseFloat(getEnv("TAX_RATE", "0.1"), 64)
	shippingCost, _ := strconv.ParseFloat(getEnv("SHIPPING_COST", "25000"), 64)

	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://localhost/ecommerce?sslmode=disable"),
		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		Port:          getEnv("PORT", "8080"),
		VNPayTMNCode:  getEnv("VNPAY_TMN_CODE", ""),
		VNPayHashKey:  getEnv("VNPAY_HASH_KEY", ""),
		VNPayURL:      getEnv("VNPAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"),
		VNPayReturnURL: getEnv("VNPAY_RETURN_URL", "http://localhost:3000/payment/return"),
		Environment:   getEnv("ENVIRONMENT", "development"),
		Debug:         debug,
		CORSOrigins:   []string{"http://localhost:3000", "http://localhost:3001"},
		TaxRate:       taxRate,
		ShippingCost:  shippingCost,
		SMTPHost:      getEnv("SMTP_HOST", ""),
		SMTPPort:      getEnv("SMTP_PORT", "587"),
		SMTPUser:      getEnv("SMTP_USER", ""),
		SMTPPassword:  getEnv("SMTP_PASSWORD", ""),
		UploadPath:    getEnv("UPLOAD_PATH", "./uploads"),
		BaseURL:       getEnv("BASE_URL", "http://localhost:8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
