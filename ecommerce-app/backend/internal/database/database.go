package database

import (
	"database/sql"
	"ecommerce-backend/internal/models"
	"fmt"
	"log"
	"net/url"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	_ "github.com/lib/pq"
)

func Initialize(databaseURL string) (*gorm.DB, error) {
	// Parse the database URL to get database name
	parsedURL, err := url.Parse(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %v", err)
	}

	dbName := strings.TrimPrefix(parsedURL.Path, "/")
	if dbName == "" {
		dbName = "ecommerce"
	}

	// Create connection URL without database name to connect to PostgreSQL server
	parsedURL.Path = "/postgres"
	serverURL := parsedURL.String()

	// Connect to PostgreSQL server
	sqlDB, err := sql.Open("postgres", serverURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL server: %v", err)
	}
	defer sqlDB.Close()

	// Check if database exists, create if it doesn't
	var exists bool
	query := `SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE datname = $1)`
	err = sqlDB.QueryRow(query, dbName).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("failed to check if database exists: %v", err)
	}

	if !exists {
		log.Printf("Creating database '%s'...", dbName)
		_, err = sqlDB.Exec(fmt.Sprintf(`CREATE DATABASE "%s"`, dbName))
		if err != nil {
			return nil, fmt.Errorf("failed to create database '%s': %v", dbName, err)
		}
		log.Printf("Database '%s' created successfully", dbName)
	} else {
		log.Printf("Database '%s' already exists", dbName)
	}

	// Now connect to the actual database
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	gormSqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	gormSqlDB.SetMaxIdleConns(10)
	gormSqlDB.SetMaxOpenConns(100)

	log.Println("Database connection established successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	log.Println("🚀 Running database migrations with auto-migration...")

	// Use the new auto-migration system
	autoMigrator := NewAutoMigrator(db)
	if err := autoMigrator.RunAutoMigration(); err != nil {
		log.Printf("❌ Auto-migration failed: %v", err)
		return err
	}

	// Create additional performance indexes
	if err := autoMigrator.CreateIndexes(); err != nil {
		log.Printf("⚠️  Failed to create some indexes: %v", err)
	}

	log.Println("✅ Database migrations completed successfully")
	return nil
}

// NewAutoMigrator creates a new auto migrator instance
func NewAutoMigrator(db *gorm.DB) *AutoMigrator {
	return &AutoMigrator{
		db: db,
		models: []interface{}{
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
		},
	}
}

// AutoMigrator handles automatic schema changes when models are updated
type AutoMigrator struct {
	db     *gorm.DB
	models []interface{}
}

// RunAutoMigration performs automatic migration for all models
func (a *AutoMigrator) RunAutoMigration() error {
	log.Println("🔄 Running auto-migration for all models...")

	for _, model := range a.models {
		if err := a.db.AutoMigrate(model); err != nil {
			log.Printf("❌ Auto-migration failed for %T: %v", model, err)
			return err
		}
	}

	log.Println("✅ Auto-migration completed for all models!")
	return nil
}

// CreateIndexes creates additional indexes for better performance
func (a *AutoMigrator) CreateIndexes() error {
	log.Println("🔍 Creating additional database indexes...")

	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_products_category_active ON products (category_id, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_products_price_active ON products (price, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_products_created_active ON products (created_at, is_active)",
		"CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders (user_id, status, created_at)",
		"CREATE INDEX IF NOT EXISTS idx_payments_order_status ON payments (order_id, status, created_at)",
	}

	for _, indexSQL := range indexes {
		if err := a.db.Exec(indexSQL).Error; err != nil {
			log.Printf("⚠️  Failed to create index: %v", err)
		} else {
			log.Printf("✅ Created index successfully")
		}
	}

	log.Println("🎉 Index creation completed!")
	return nil
}
