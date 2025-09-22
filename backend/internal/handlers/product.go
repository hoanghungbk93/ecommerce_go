package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductHandler struct {
	db    *gorm.DB
	redis *services.RedisService
}

func NewProductHandler(db *gorm.DB, redis *services.RedisService) *ProductHandler {
	return &ProductHandler{
		db:    db,
		redis: redis,
	}
}

type CreateProductRequest struct {
	Name             string  `json:"name" binding:"required"`
	Description      string  `json:"description"`
	ShortDescription string  `json:"short_description"`
	Price            float64 `json:"price" binding:"required,min=0"`
	SKU              string  `json:"sku" binding:"required"`
	Stock            int     `json:"stock" binding:"min=0"`
	ImageURL         string  `json:"image_url"`
	CategoryID       uint    `json:"category_id"`
	Brand            string  `json:"brand"`
	Tags             string  `json:"tags"`
	IsFeatured       bool    `json:"is_featured"`
}

func (h *ProductHandler) GetProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	categoryID := c.Query("category_id")

	if h.redis != nil {
		ctx := context.Background()
		cacheKey := h.redis.GenerateProductListCacheKey(page, limit, search, categoryID)

		var cachedData services.ProductListCache
		if err := h.redis.Get(ctx, cacheKey, &cachedData); err == nil {
			log.Printf("🎯 REDIS CACHE HIT for key: %s", cacheKey)
			c.JSON(http.StatusOK, gin.H{
				"products": cachedData.Products,
				"total":    cachedData.Total,
				"page":     cachedData.Page,
				"limit":    cachedData.Limit,
			})
			return
		}

		log.Printf("Cache miss for key: %s", cacheKey)
	}

	offset := (page - 1) * limit
	query := h.db.Where("is_active = ?", true)

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	var products []models.Product
	var total int64

	query.Model(&models.Product{}).Count(&total)
	query.Preload("Category").Offset(offset).Limit(limit).Find(&products)

	responseData := gin.H{
		"products": products,
		"total":    total,
		"page":     page,
		"limit":    limit,
	}

	if h.redis != nil {
		ctx := context.Background()
		cacheKey := h.redis.GenerateProductListCacheKey(page, limit, search, categoryID)
		cacheData := services.ProductListCache{
			Products: products,
			Total:    total,
			Page:     page,
			Limit:    limit,
		}

		if err := h.redis.Set(ctx, cacheKey, cacheData, 10*time.Minute); err != nil {
			log.Printf("❌ Failed to cache data for key %s: %v", cacheKey, err)
		} else {
			log.Printf("💾 REDIS CACHE SET for key: %s", cacheKey)
		}
	}

	c.JSON(http.StatusOK, responseData)
}

func (h *ProductHandler) invalidateProductListCache() {
	if h.redis != nil {
		ctx := context.Background()
		pattern := "products:list:*"
		if err := h.redis.DeletePattern(ctx, pattern); err != nil {
			log.Printf("Failed to invalidate product list cache: %v", err)
		} else {
			log.Printf("Invalidated product list cache with pattern: %s", pattern)
		}
	}
}

func (h *ProductHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")

	var product models.Product
	if err := h.db.Preload("Category").Where("is_active = ?", true).First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingProduct models.Product
	if err := h.db.Where("sku = ?", req.SKU).First(&existingProduct).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "SKU already exists"})
		return
	}

	product := models.Product{
		Name:             req.Name,
		Slug:             req.Name, // Simple slug generation
		Description:      req.Description,
		ShortDescription: req.ShortDescription,
		Price:            req.Price,
		SKU:              req.SKU,
		Stock:            req.Stock,
		ImageURL:         req.ImageURL,
		CategoryID:       req.CategoryID,
		Brand:            req.Brand,
		Tags:             req.Tags,
		IsFeatured:       req.IsFeatured,
		IsActive:         true,
	}

	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	h.db.Preload("Category").First(&product, product.ID)

	h.invalidateProductListCache()

	c.JSON(http.StatusCreated, product)
}

func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id := c.Param("id")

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingProduct models.Product
	if err := h.db.Where("sku = ? AND id != ?", req.SKU, id).First(&existingProduct).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "SKU already exists"})
		return
	}

	product.Name = req.Name
	product.Slug = req.Name
	product.Description = req.Description
	product.ShortDescription = req.ShortDescription
	product.Price = req.Price
	product.SKU = req.SKU
	product.Stock = req.Stock
	product.ImageURL = req.ImageURL
	product.CategoryID = req.CategoryID
	product.Brand = req.Brand
	product.Tags = req.Tags
	product.IsFeatured = req.IsFeatured

	if err := h.db.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	h.db.Preload("Category").First(&product, product.ID)

	h.invalidateProductListCache()

	c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if err := h.db.Delete(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	h.invalidateProductListCache()

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

// ApproveProduct - Admin endpoint to approve partner products
func (h *ProductHandler) ApproveProduct(c *gin.Context) {
	id := c.Param("id")

	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	product.IsActive = true
	if err := h.db.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve product"})
		return
	}

	h.invalidateProductListCache()

	c.JSON(http.StatusOK, gin.H{
		"message": "Product approved successfully",
		"product": product,
	})
}

// GetPendingProducts - Admin endpoint to get products pending approval
func (h *ProductHandler) GetPendingProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var products []models.Product
	var total int64

	query := h.db.Where("is_active = ?", false)
	query.Model(&models.Product{}).Count(&total)
	query.Preload("Category").Offset(offset).Limit(limit).Find(&products)

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}
