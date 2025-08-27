package migrations

import (
	"ecommerce-backend/internal/models"
	"log"
	"reflect"

	"gorm.io/gorm"
)

// AutoMigrator handles automatic schema changes when models are updated
type AutoMigrator struct {
	db     *gorm.DB
	models []interface{}
}

// NewAutoMigrator creates a new auto migrator with all models
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

// RunAutoMigration performs automatic migration for all models
func (a *AutoMigrator) RunAutoMigration() error {
	log.Println("🔄 Running auto-migration for all models...")

	for _, model := range a.models {
		modelType := reflect.TypeOf(model).Elem()
		log.Printf("📋 Auto-migrating model: %s", modelType.Name())

		if err := a.db.AutoMigrate(model); err != nil {
			log.Printf("❌ Auto-migration failed for %s: %v", modelType.Name(), err)
			return err
		}

		log.Printf("✅ Auto-migration completed for %s", modelType.Name())
	}

	log.Println("🎉 Auto-migration completed for all models!")
	return nil
}

// CreateIndexes creates additional indexes that might not be covered by GORM tags
func (a *AutoMigrator) CreateIndexes() error {
	log.Println("🔍 Creating additional database indexes...")

	indexes := []struct {
		table   string
		columns []string
		name    string
	}{
		// Performance indexes
		{"products", []string{"category_id", "is_active", "is_featured"}, "idx_products_category_active_featured"},
		{"products", []string{"price", "is_active"}, "idx_products_price_active"},
		{"products", []string{"created_at", "is_active"}, "idx_products_created_active"},
		{"orders", []string{"user_id", "status", "created_at"}, "idx_orders_user_status_created"},
		{"order_items", []string{"order_id", "product_id"}, "idx_order_items_order_product"},
		{"cart_items", []string{"cart_id", "product_id"}, "idx_cart_items_cart_product"},
		{"product_reviews", []string{"product_id", "is_verified", "created_at"}, "idx_reviews_product_verified_created"},
		{"payments", []string{"order_id", "status", "created_at"}, "idx_payments_order_status_created"},
		{"audit_logs", []string{"user_id", "resource", "created_at"}, "idx_audit_user_resource_created"},
	}

	for _, idx := range indexes {
		sql := "CREATE INDEX IF NOT EXISTS " + idx.name + " ON " + idx.table + " (" + joinStrings(idx.columns, ", ") + ")"
		
		if err := a.db.Exec(sql).Error; err != nil {
			log.Printf("⚠️  Failed to create index %s: %v", idx.name, err)
		} else {
			log.Printf("✅ Created index: %s", idx.name)
		}
	}

	log.Println("🎉 Index creation completed!")
	return nil
}

// AddColumn adds a new column to existing table (for manual migrations)
func (a *AutoMigrator) AddColumn(tableName, columnName, columnType string) error {
	if a.hasColumn(tableName, columnName) {
		log.Printf("⏭️  Column %s.%s already exists, skipping...", tableName, columnName)
		return nil
	}

	sql := "ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnType
	log.Printf("🔧 Adding column: %s", sql)

	if err := a.db.Exec(sql).Error; err != nil {
		log.Printf("❌ Failed to add column: %v", err)
		return err
	}

	log.Printf("✅ Column %s.%s added successfully", tableName, columnName)
	return nil
}

// DropColumn removes a column from existing table
func (a *AutoMigrator) DropColumn(tableName, columnName string) error {
	if !a.hasColumn(tableName, columnName) {
		log.Printf("⏭️  Column %s.%s doesn't exist, skipping...", tableName, columnName)
		return nil
	}

	sql := "ALTER TABLE " + tableName + " DROP COLUMN " + columnName
	log.Printf("🗑️  Dropping column: %s", sql)

	if err := a.db.Exec(sql).Error; err != nil {
		log.Printf("❌ Failed to drop column: %v", err)
		return err
	}

	log.Printf("✅ Column %s.%s dropped successfully", tableName, columnName)
	return nil
}

// RenameColumn renames a column in existing table
func (a *AutoMigrator) RenameColumn(tableName, oldName, newName string) error {
	if !a.hasColumn(tableName, oldName) {
		log.Printf("⏭️  Column %s.%s doesn't exist, skipping...", tableName, oldName)
		return nil
	}

	if a.hasColumn(tableName, newName) {
		log.Printf("⏭️  Column %s.%s already exists, skipping...", tableName, newName)
		return nil
	}

	sql := "ALTER TABLE " + tableName + " RENAME COLUMN " + oldName + " TO " + newName
	log.Printf("🔄 Renaming column: %s", sql)

	if err := a.db.Exec(sql).Error; err != nil {
		log.Printf("❌ Failed to rename column: %v", err)
		return err
	}

	log.Printf("✅ Column %s.%s renamed to %s successfully", tableName, oldName, newName)
	return nil
}

// hasColumn checks if a column exists in the table
func (a *AutoMigrator) hasColumn(tableName, columnName string) bool {
	var count int64
	query := `
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_name = ? AND column_name = ?
	`
	a.db.Raw(query, tableName, columnName).Scan(&count)
	return count > 0
}

// Helper function to join strings
func joinStrings(slice []string, separator string) string {
	if len(slice) == 0 {
		return ""
	}
	if len(slice) == 1 {
		return slice[0]
	}
	
	result := slice[0]
	for i := 1; i < len(slice); i++ {
		result += separator + slice[i]
	}
	return result
}
