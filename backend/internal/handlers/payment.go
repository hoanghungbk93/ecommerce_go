package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"ecommerce-backend/internal/config"
	"ecommerce-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	db     *gorm.DB
	config *config.Config
}

func NewPaymentHandler(db *gorm.DB, cfg *config.Config) *PaymentHandler {
	return &PaymentHandler{db: db, config: cfg}
}

type CreateVNPayPaymentRequest struct {
	OrderID uint   `json:"order_id" binding:"required"`
	Amount  int64  `json:"amount" binding:"required"`
	OrderInfo string `json:"order_info"`
}

func (h *PaymentHandler) CreateVNPayPayment(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req CreateVNPayPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if err := h.db.Where("id = ? AND user_id = ?", req.OrderID, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.PaymentStatus != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order payment already processed"})
		return
	}

	txnRef := fmt.Sprintf("ORDER_%d_%d", order.ID, time.Now().Unix())
	
	payment := models.Payment{
		OrderID:       order.ID,
		PaymentMethod: "vnpay",
		Status:        "pending",
		Amount:        float64(req.Amount),
		Currency:      "VND",
		TransactionID: txnRef,
	}

	if err := h.db.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
		return
	}

	paymentURL := h.createVNPayURL(txnRef, req.Amount, req.OrderInfo)

	h.db.Save(&payment)

	c.JSON(http.StatusOK, gin.H{
		"payment_url": paymentURL,
		"payment_id":  payment.ID,
	})
}

func (h *PaymentHandler) VNPayReturn(c *gin.Context) {
	params := c.Request.URL.Query()
	
	if !h.validateVNPayResponse(params) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment response"})
		return
	}

	txnRef := params.Get("vnp_TxnRef")
	responseCode := params.Get("vnp_ResponseCode")
	amount := params.Get("vnp_Amount")

	var payment models.Payment
	if err := h.db.Where("transaction_id = ?", txnRef).First(&payment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	if responseCode == "00" {
		payment.Status = "completed"
		payment.ProcessedAt = &[]time.Time{time.Now()}[0]
		
		h.db.Model(&models.Order{}).Where("id = ?", payment.OrderID).Updates(map[string]interface{}{
			"payment_status": "paid",
			"status":         "confirmed",
		})
	} else {
		payment.Status = "failed"
	}

	payment.GatewayResponse = fmt.Sprintf("ResponseCode: %s, Amount: %s", responseCode, amount)
	h.db.Save(&payment)

	c.JSON(http.StatusOK, gin.H{
		"status":  payment.Status,
		"message": "Payment processed",
	})
}

func (h *PaymentHandler) VNPayWebhook(c *gin.Context) {
	params := c.Request.URL.Query()
	
	if !h.validateVNPayResponse(params) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook signature"})
		return
	}

	txnRef := params.Get("vnp_TxnRef")
	responseCode := params.Get("vnp_ResponseCode")

	var payment models.Payment
	if err := h.db.Where("transaction_id = ?", txnRef).First(&payment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	if responseCode == "00" && payment.Status == "pending" {
		payment.Status = "completed"
		payment.ProcessedAt = &[]time.Time{time.Now()}[0]
		
		h.db.Model(&models.Order{}).Where("id = ?", payment.OrderID).Updates(map[string]interface{}{
			"payment_status": "paid",
			"status":         "confirmed",
		})

		h.db.Save(&payment)
	}

	c.JSON(http.StatusOK, gin.H{"RspCode": "00", "Message": "Success"})
}

func (h *PaymentHandler) createVNPayURL(txnRef string, amount int64, orderInfo string) string {
	params := url.Values{}
	params.Set("vnp_Version", "2.1.0")
	params.Set("vnp_Command", "pay")
	params.Set("vnp_TmnCode", h.config.VNPayTMNCode)
	params.Set("vnp_Amount", strconv.FormatInt(amount*100, 10))
	params.Set("vnp_CurrCode", "VND")
	params.Set("vnp_TxnRef", txnRef)
	params.Set("vnp_OrderInfo", orderInfo)
	params.Set("vnp_OrderType", "other")
	params.Set("vnp_Locale", "vn")
	params.Set("vnp_ReturnUrl", h.config.VNPayReturnURL)
	params.Set("vnp_CreateDate", time.Now().Format("20060102150405"))
	params.Set("vnp_IpAddr", "127.0.0.1")

	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var signData strings.Builder
	for i, k := range keys {
		if i > 0 {
			signData.WriteString("&")
		}
		signData.WriteString(k)
		signData.WriteString("=")
		signData.WriteString(params.Get(k))
	}

	h256 := hmac.New(sha256.New, []byte(h.config.VNPayHashKey))
	h256.Write([]byte(signData.String()))
	signature := hex.EncodeToString(h256.Sum(nil))

	params.Set("vnp_SecureHash", signature)

	return h.config.VNPayURL + "?" + params.Encode()
}

func (h *PaymentHandler) validateVNPayResponse(params url.Values) bool {
	signature := params.Get("vnp_SecureHash")
	params.Del("vnp_SecureHash")
	params.Del("vnp_SecureHashType")

	keys := make([]string, 0, len(params))
	for k := range params {
		if params.Get(k) != "" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)

	var signData strings.Builder
	for i, k := range keys {
		if i > 0 {
			signData.WriteString("&")
		}
		signData.WriteString(k)
		signData.WriteString("=")
		signData.WriteString(params.Get(k))
	}

	h256 := hmac.New(sha256.New, []byte(h.config.VNPayHashKey))
	h256.Write([]byte(signData.String()))
	expectedSignature := hex.EncodeToString(h256.Sum(nil))

	return signature == expectedSignature
}
