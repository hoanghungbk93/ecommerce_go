package handlers

import (
	"net/http"
	"strconv"

	"ecommerce-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryHandler struct {
	db *gorm.DB
}

func NewCategoryHandler(db *gorm.DB) *CategoryHandler {
	return &CategoryHandler{db: db}
}

// GetCategories - Public endpoint to get all categories
func (h *CategoryHandler) GetCategories(c *gin.Context) {
	var categories []models.Category

	if err := h.db.Where("is_active = ?", true).Preload("Parent").Preload("Children").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// GetAllCategories - Admin endpoint to get all categories (including inactive)
func (h *CategoryHandler) GetAllCategories(c *gin.Context) {
	var categories []models.Category

	if err := h.db.Preload("Parent").Preload("Children").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// GetCategory - Admin endpoint to get a specific category
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	id := c.Param("id")

	var category models.Category
	if err := h.db.Preload("Parent").Preload("Children").First(&category, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category"})
		}
		return
	}

	c.JSON(http.StatusOK, category)
}

type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
	ParentID    *uint  `json:"parent_id"`
	IsActive    *bool  `json:"is_active"`
}

// CreateCategory - Admin endpoint to create a new category
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if category with this name already exists
	var existingCategory models.Category
	if err := h.db.Where("name = ?", req.Name).First(&existingCategory).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Category with this name already exists"})
		return
	}

	// Validate parent category if provided
	if req.ParentID != nil {
		var parentCategory models.Category
		if err := h.db.First(&parentCategory, *req.ParentID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent category not found"})
			return
		}
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := models.Category{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		ParentID:    req.ParentID,
		IsActive:    isActive,
	}

	if err := h.db.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	// Load relationships
	h.db.Preload("Parent").Preload("Children").First(&category, category.ID)

	c.JSON(http.StatusCreated, category)
}

type UpdateCategoryRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	ImageURL    *string `json:"image_url"`
	ParentID    *uint   `json:"parent_id"`
	IsActive    *bool   `json:"is_active"`
}

// UpdateCategory - Admin endpoint to update a category
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id := c.Param("id")

	var category models.Category
	if err := h.db.First(&category, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category"})
		}
		return
	}

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update only provided fields
	if req.Name != nil {
		// Check if name is already taken by another category
		var existingCategory models.Category
		if err := h.db.Where("name = ? AND id != ?", *req.Name, id).First(&existingCategory).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Category name already taken"})
			return
		}
		category.Name = *req.Name
	}
	if req.Description != nil {
		category.Description = *req.Description
	}
	if req.ImageURL != nil {
		category.ImageURL = *req.ImageURL
	}
	if req.ParentID != nil {
		// Validate parent category exists and is not the category itself
		categoryIDUint, _ := strconv.ParseUint(id, 10, 32)
		if *req.ParentID == uint(categoryIDUint) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Category cannot be its own parent"})
			return
		}
		
		var parentCategory models.Category
		if err := h.db.First(&parentCategory, *req.ParentID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent category not found"})
			return
		}
		category.ParentID = req.ParentID
	}
	if req.IsActive != nil {
		category.IsActive = *req.IsActive
	}

	if err := h.db.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
		return
	}

	// Load relationships
	h.db.Preload("Parent").Preload("Children").First(&category, category.ID)

	c.JSON(http.StatusOK, category)
}

// DeleteCategory - Admin endpoint to delete a category
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id := c.Param("id")

	var category models.Category
	if err := h.db.First(&category, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category"})
		}
		return
	}

	// Check if category has products
	var productCount int64
	h.db.Model(&models.Product{}).Where("category_id = ?", id).Count(&productCount)
	if productCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete category with associated products"})
		return
	}

	// Check if category has child categories
	var childCount int64
	h.db.Model(&models.Category{}).Where("parent_id = ?", id).Count(&childCount)
	if childCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete category with child categories"})
		return
	}

	if err := h.db.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}
