package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ecommerce-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PartnerHandler struct {
	db *gorm.DB
}

func NewPartnerHandler(db *gorm.DB) *PartnerHandler {
	return &PartnerHandler{db: db}
}

// Admin Partner Management

// GetAllPartners - Admin endpoint to get all partners
func (h *PartnerHandler) GetAllPartners(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	offset := (page - 1) * limit

	var partners []models.Partner
	var total int64

	query := h.db.Model(&models.Partner{})

	// Apply search filter if provided
	if search != "" {
		query = query.Where("name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	query.Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&partners).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch partners"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"partners": partners,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetPartner - Admin endpoint to get a specific partner
func (h *PartnerHandler) GetPartner(c *gin.Context) {
	id := c.Param("id")

	var partner models.Partner
	if err := h.db.First(&partner, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Partner not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch partner"})
		}
		return
	}

	c.JSON(http.StatusOK, partner)
}

type CreatePartnerRequest struct {
	Name           string  `json:"name" binding:"required"`
	Email          string  `json:"email" binding:"required,email"`
	WebhookURL     string  `json:"webhook_url"`
	CommissionRate float64 `json:"commission_rate"`
}

// generateAPIKey generates a random API key
func generateAPIKey() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateSecretKey generates a random secret key
func generateSecretKey() string {
	bytes := make([]byte, 64)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// CreatePartner - Admin endpoint to create a new partner
func (h *PartnerHandler) CreatePartner(c *gin.Context) {
	var req CreatePartnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if partner with this email already exists
	var existingPartner models.Partner
	if err := h.db.Where("email = ?", req.Email).First(&existingPartner).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Partner with this email already exists"})
		return
	}

	// Generate API and secret keys
	apiKey := generateAPIKey()
	secretKey := generateSecretKey()

	partner := models.Partner{
		Name:           req.Name,
		Email:          req.Email,
		APIKey:         apiKey,
		SecretKey:      secretKey,
		WebhookURL:     req.WebhookURL,
		IsActive:       true,
		CommissionRate: req.CommissionRate,
	}

	if err := h.db.Create(&partner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create partner"})
		return
	}

	// Return partner with keys visible for initial setup
	c.JSON(http.StatusCreated, gin.H{
		"id": partner.ID,
		"name": partner.Name,
		"email": partner.Email,
		"api_key": partner.APIKey,
		"secret_key": partner.SecretKey,
		"webhook_url": partner.WebhookURL,
		"is_active": partner.IsActive,
		"commission_rate": partner.CommissionRate,
		"created_at": partner.CreatedAt,
		"updated_at": partner.UpdatedAt,
		"message": "Partner created successfully. Please save your API credentials as the secret key will not be shown again.",
	})
}

type UpdatePartnerRequest struct {
	Name           *string  `json:"name"`
	Email          *string  `json:"email"`
	WebhookURL     *string  `json:"webhook_url"`
	CommissionRate *float64 `json:"commission_rate"`
	IsActive       *bool    `json:"is_active"`
}

// UpdatePartner - Admin endpoint to update a partner
func (h *PartnerHandler) UpdatePartner(c *gin.Context) {
	id := c.Param("id")

	var partner models.Partner
	if err := h.db.First(&partner, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Partner not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch partner"})
		}
		return
	}

	var req UpdatePartnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update only provided fields
	if req.Name != nil {
		partner.Name = *req.Name
	}
	if req.Email != nil {
		// Check if email is already taken by another partner
		var existingPartner models.Partner
		if err := h.db.Where("email = ? AND id != ?", *req.Email, id).First(&existingPartner).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already taken by another partner"})
			return
		}
		partner.Email = *req.Email
	}
	if req.WebhookURL != nil {
		partner.WebhookURL = *req.WebhookURL
	}
	if req.CommissionRate != nil {
		partner.CommissionRate = *req.CommissionRate
	}
	if req.IsActive != nil {
		partner.IsActive = *req.IsActive
	}

	if err := h.db.Save(&partner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update partner"})
		return
	}

	c.JSON(http.StatusOK, partner)
}

// DeletePartner - Admin endpoint to delete a partner
func (h *PartnerHandler) DeletePartner(c *gin.Context) {
	id := c.Param("id")

	var partner models.Partner
	if err := h.db.First(&partner, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Partner not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch partner"})
		}
		return
	}

	if err := h.db.Delete(&partner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete partner"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Partner deleted successfully"})
}

// TogglePartnerStatus - Admin endpoint to toggle partner active status
func (h *PartnerHandler) TogglePartnerStatus(c *gin.Context) {
	id := c.Param("id")

	var partner models.Partner
	if err := h.db.First(&partner, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Partner not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch partner"})
		}
		return
	}

	// Toggle the status
	partner.IsActive = !partner.IsActive

	if err := h.db.Save(&partner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update partner status"})
		return
	}

	c.JSON(http.StatusOK, partner)
}

// RegenerateAPIKeys - Admin endpoint to regenerate partner API keys
func (h *PartnerHandler) RegenerateAPIKeys(c *gin.Context) {
	id := c.Param("id")

	var partner models.Partner
	if err := h.db.First(&partner, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Partner not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch partner"})
		}
		return
	}

	// Generate new keys
	newAPIKey := generateAPIKey()
	newSecretKey := generateSecretKey()

	partner.APIKey = newAPIKey
	partner.SecretKey = newSecretKey

	if err := h.db.Save(&partner).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to regenerate API keys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"api_key":    newAPIKey,
		"secret_key": newSecretKey,
	})
}

// Partner Product Management (for partners to manage their own products)

func (h *PartnerHandler) GetProducts(c *gin.Context) {
	_, exists := c.Get("partner_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Partner not authenticated"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var products []models.Product
	var total int64

	// For now, return all products since Product model doesn't have PartnerID
	// TODO: Add PartnerID field to Product model for proper partner isolation
	query := h.db.Model(&models.Product{})
	query.Count(&total)

	if err := query.Preload("Category").Offset(offset).Limit(limit).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

type PartnerCreateProductRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	Price       float64 `json:"price" binding:"required"`
	Stock       int     `json:"stock"`
	SKU         string  `json:"sku" binding:"required"`
	ImageURL    string  `json:"image_url"`
	CategoryID  uint    `json:"category_id" binding:"required"`
	Brand       string  `json:"brand"`
}

func (h *PartnerHandler) CreateProduct(c *gin.Context) {
	_, exists := c.Get("partner_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Partner not authenticated"})
		return
	}

	var req PartnerCreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingProduct models.Product
	if err := h.db.Where("sku = ?", req.SKU).First(&existingProduct).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "SKU already exists"})
		return
	}

	// Generate slug from name
	slug := strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	
	product := models.Product{
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		SKU:         req.SKU,
		ImageURL:    req.ImageURL,
		CategoryID:  req.CategoryID,
		Brand:       req.Brand,
		IsActive:    false, // Partner products require approval
	}

	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	// Explicitly update is_active to false after creation to override database default
	if err := h.db.Model(&product).Update("is_active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set product status"})
		return
	}

	h.db.Preload("Category").First(&product, product.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Product created successfully and pending approval",
		"product": product,
	})
}

func (h *PartnerHandler) UpdateProduct(c *gin.Context) {
	_, exists := c.Get("partner_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Partner not authenticated"})
		return
	}

	productID := c.Param("id")

	var product models.Product
	// For now, just check if product exists since Product model doesn't have PartnerID
	// TODO: Add PartnerID field to Product model for proper partner isolation
	if err := h.db.Where("id = ?", productID).First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var req PartnerCreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingProduct models.Product
	if err := h.db.Where("sku = ? AND id != ?", req.SKU, productID).First(&existingProduct).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "SKU already exists"})
		return
	}

	product.Name = req.Name
	product.Description = req.Description
	product.Price = req.Price
	product.Stock = req.Stock
	product.SKU = req.SKU
	product.ImageURL = req.ImageURL
	product.CategoryID = req.CategoryID
	product.Brand = req.Brand

	if err := h.db.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	h.db.Preload("Category").First(&product, product.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Product updated successfully",
		"product": product,
	})
}

type PaymentWebhookRequest struct {
	OrderID       string  `json:"order_id" binding:"required"`
	PaymentID     string  `json:"payment_id" binding:"required"`
	Status        string  `json:"status" binding:"required"`
	Amount        float64 `json:"amount" binding:"required"`
	Currency      string  `json:"currency"`
	TransactionID string  `json:"transaction_id"`
	Signature     string  `json:"signature" binding:"required"`
}

func (h *PartnerHandler) PaymentWebhook(c *gin.Context) {
	partnerID, exists := c.Get("partner_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Partner not authenticated"})
		return
	}

	var req PaymentWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var partner models.Partner
	if err := h.db.Where("id = ?", partnerID).First(&partner).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Partner not found"})
		return
	}

	var payment models.Payment
	if err := h.db.Where("transaction_id = ?", req.TransactionID).First(&payment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	if req.Status == "completed" {
		payment.Status = "completed"
		var now = time.Now()
		payment.ProcessedAt = &now
		
		h.db.Model(&models.Order{}).Where("id = ?", payment.OrderID).Updates(map[string]interface{}{
			"payment_status": "paid",
			"status":         "confirmed",
		})
	} else {
		payment.Status = "failed"
	}

	payment.GatewayResponse = fmt.Sprintf("Partner webhook: %s", req.Status)
	h.db.Save(&payment)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Webhook processed successfully",
	})
}
