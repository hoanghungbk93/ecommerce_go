package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"ecommerce-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OrderHandler struct {
	db *gorm.DB
}

func NewOrderHandler(db *gorm.DB) *OrderHandler {
	return &OrderHandler{db: db}
}

func (h *OrderHandler) GetUserOrders(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var orders []models.Order
	if err := h.db.Where("user_id = ?", userID).Preload("Items.Product").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, orders)
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	orderID := c.Param("id")

	var order models.Order
	if err := h.db.Where("id = ? AND user_id = ?", orderID, userID).Preload("Items.Product").Preload("ShippingAddress").First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, order)
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Items           []struct {
			ProductID int `json:"product_id"`
			Quantity  int `json:"quantity"`
		} `json:"items"`
		ShippingAddress models.ShippingAddress `json:"shipping_address"`
		PaymentMethod   string                  `json:"payment_method"`
		Notes           string                  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate total
	var total float64
	var orderItems []models.OrderItem

	for _, item := range req.Items {
		var product models.Product
		if err := h.db.First(&product, item.ProductID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Product %d not found", item.ProductID)})
			return
		}

		if product.Stock < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Insufficient stock for product %s", product.Name)})
			return
		}

		itemTotal := product.Price * float64(item.Quantity)
		total += itemTotal

		orderItems = append(orderItems, models.OrderItem{
			ProductID:  uint(item.ProductID),
			Quantity:   item.Quantity,
			UnitPrice:  product.Price,
			TotalPrice: itemTotal,
		})
	}

	// Create order
	orderNumber := fmt.Sprintf("ORD-%d-%d", userID, time.Now().Unix())
	order := models.Order{
		OrderNumber:   orderNumber,
		UserID:        userID.(uint),
		Status:        "pending",
		PaymentStatus: "pending",
		PaymentMethod: req.PaymentMethod,
		Subtotal:      total,
		Total:         total,
		Currency:      "VND",
		Notes:         req.Notes,
		OrderDate:     time.Now(),
		Items:         orderItems,
	}

	// Set shipping address
	req.ShippingAddress.OrderID = order.ID
	order.ShippingAddress = req.ShippingAddress

	if err := h.db.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Update product stock
	for i, item := range req.Items {
		h.db.Model(&models.Product{}).Where("id = ?", item.ProductID).Update("stock", gorm.Expr("stock - ?", item.Quantity))
		orderItems[i].OrderID = order.ID
	}

	c.JSON(http.StatusCreated, order)
}

func (h *OrderHandler) GetAllOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var orders []models.Order
	var total int64

	h.db.Model(&models.Order{}).Count(&total)
	if err := h.db.Preload("User").Preload("Items.Product").Offset(offset).Limit(limit).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	orderID := c.Param("id")

	var req struct {
		Status string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if err := h.db.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	order.Status = req.Status
	if req.Status == "shipped" {
		now := time.Now()
		order.ShippedAt = &now
	} else if req.Status == "delivered" {
		now := time.Now()
		order.DeliveredAt = &now
	} else if req.Status == "cancelled" {
		now := time.Now()
		order.CancelledAt = &now
	}

	if err := h.db.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Order status updated successfully",
		"order":   order,
	})
}
