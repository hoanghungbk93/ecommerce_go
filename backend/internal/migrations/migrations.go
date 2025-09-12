package migrations

import (
	"ecommerce-backend/internal/models"
	"log"

	"gorm.io/gorm"
)

// GetAllMigrations returns all predefined migrations
func GetAllMigrations() []MigrationStep {
	return []MigrationStep{
		{
			Version:     "001_initial_schema",
			Name:        "Create initial database schema",
			Description: "Creates all initial tables for the ecommerce application",
			Up:          migration001Up,
			Down:        migration001Down,
		},
		{
			Version:     "002_add_product_indexes",
			Name:        "Add performance indexes for products",
			Description: "Adds indexes to improve product query performance",
			Up:          migration002Up,
			Down:        migration002Down,
		},
		{
			Version:     "003_add_audit_log_enhancements",
			Name:        "Enhance audit logging capabilities",
			Description: "Adds additional fields for better audit tracking",
			Up:          migration003Up,
			Down:        migration003Down,
		},
		// Add more migrations here as your schema evolves
	}
}

// Migration 001: Initial schema
func migration001Up(db *gorm.DB) error {
	log.Println("📋 Creating initial database schema...")

	// Create all tables using AutoMigrate
	models := []interface{}{
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.ProductImage{},
		&models.ProductReview{},
		&models.Cart{},
		&models.CartItem{},
		&models.Order{},
		&models.OrderItem{},
		&models.ShippingAddress{},
		&models.Payment{},
		&models.Coupon{},
		&models.Partner{},
		&models.RefreshToken{},
		&models.AuditLog{},
	}

	for _, model := range models {
		if err := db.AutoMigrate(model); err != nil {
			return err
		}
	}

	log.Println("✅ Initial schema created successfully")
	return nil
}

func migration001Down(db *gorm.DB) error {
	log.Println("🗑️  Dropping initial database schema...")

	tables := []string{
		"audit_logs",
		"refresh_tokens",
		"partners",
		"coupons",
		"payments",
		"shipping_addresses",
		"order_items",
		"orders",
		"cart_items",
		"carts",
		"product_reviews",
		"product_images",
		"products",
		"categories",
		"users",
	}

	for _, table := range tables {
		if err := db.Exec("DROP TABLE IF EXISTS " + table + " CASCADE").Error; err != nil {
			log.Printf("⚠️  Failed to drop table %s: %v", table, err)
		}
	}

	log.Println("✅ Initial schema dropped successfully")
	return nil
}

// Migration 002: Add product indexes
func migration002Up(db *gorm.DB) error {
	log.Println("🔍 Adding performance indexes for products...")

	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_products_category_active ON products (category_id, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_products_price_range ON products (price) WHERE is_active = true",
		"CREATE INDEX IF NOT EXISTS idx_products_featured ON products (is_featured, created_at) WHERE is_active = true",
		"CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description))",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("⚠️  Failed to create index: %v", err)
			return err
		}
	}

	log.Println("✅ Product indexes added successfully")
	return nil
}

func migration002Down(db *gorm.DB) error {
	log.Println("🗑️  Dropping product performance indexes...")

	indexes := []string{
		"DROP INDEX IF EXISTS idx_products_category_active",
		"DROP INDEX IF EXISTS idx_products_price_range",
		"DROP INDEX IF EXISTS idx_products_featured",
		"DROP INDEX IF EXISTS idx_products_brand",
		"DROP INDEX IF EXISTS idx_products_search",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("⚠️  Failed to drop index: %v", err)
		}
	}

	log.Println("✅ Product indexes dropped successfully")
	return nil
}

// Migration 003: Enhance audit logging
func migration003Up(db *gorm.DB) error {
	log.Println("🔧 Enhancing audit logging capabilities...")

	// Add session_id column to audit_logs if it doesn't exist
	var count int64
	db.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'session_id'").Scan(&count)
	
	if count == 0 {
		if err := db.Exec("ALTER TABLE audit_logs ADD COLUMN session_id VARCHAR(255)").Error; err != nil {
			return err
		}
		log.Println("✅ Added session_id column to audit_logs")
	}

	// Add request_id column to audit_logs if it doesn't exist
	db.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'request_id'").Scan(&count)
	
	if count == 0 {
		if err := db.Exec("ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(255)").Error; err != nil {
			return err
		}
		log.Println("✅ Added request_id column to audit_logs")
	}

	// Create index on audit logs for better performance
	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs (session_id, created_at)").Error; err != nil {
		return err
	}

	if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs (request_id)").Error; err != nil {
		return err
	}

	log.Println("✅ Audit logging enhancements completed")
	return nil
}

func migration003Down(db *gorm.DB) error {
	log.Println("🗑️  Removing audit logging enhancements...")

	// Drop indexes
	db.Exec("DROP INDEX IF EXISTS idx_audit_logs_session")
	db.Exec("DROP INDEX IF EXISTS idx_audit_logs_request")

	// Remove columns
	db.Exec("ALTER TABLE audit_logs DROP COLUMN IF EXISTS session_id")
	db.Exec("ALTER TABLE audit_logs DROP COLUMN IF EXISTS request_id")

	log.Println("✅ Audit logging enhancements removed")
	return nil
}

// Example of how to add a new migration when you modify models
func ExampleNewMigration() MigrationStep {
	return MigrationStep{
		Version:     "004_add_product_variants",
		Name:        "Add product variants support",
		Description: "Adds support for product variants (size, color, etc.)",
		Up: func(db *gorm.DB) error {
			// Example: Add a new table for product variants
			type ProductVariant struct {
				ID        uint    `gorm:"primaryKey"`
				ProductID uint    `gorm:"not null"`
				Name      string  `gorm:"not null"`
				Value     string  `gorm:"not null"`
				Price     float64 `gorm:"default:0"`
				Stock     int     `gorm:"default:0"`
			}

			if err := db.AutoMigrate(&ProductVariant{}); err != nil {
				return err
			}

			// Add indexes
			return db.Exec("CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id)").Error
		},
		Down: func(db *gorm.DB) error {
			return db.Exec("DROP TABLE IF EXISTS product_variants").Error
		},
	}
}
