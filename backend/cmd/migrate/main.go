package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"ecommerce-backend/internal/config"
	"ecommerce-backend/internal/database"
	"ecommerce-backend/internal/migrations"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	cfg := config.Load()

	// Command line flags
	var (
		command   = flag.String("command", "migrate", "Command to run: migrate, rollback, status, auto-migrate, create-indexes")
		version   = flag.String("version", "", "Migration version (required for rollback)")
		force     = flag.Bool("force", false, "Force migration without confirmation")
	)
	flag.Parse()

	// Initialize database connection
	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Create migration manager
	manager := migrations.NewManager(db)
	
	// Add all predefined migrations
	for _, migration := range migrations.GetAllMigrations() {
		manager.AddMigration(migration)
	}

	switch *command {
	case "migrate":
		runMigrations(manager, *force)
	case "rollback":
		rollbackMigration(manager, *version, *force)
	case "status":
		showMigrationStatus(manager)
	case "auto-migrate":
		runAutoMigration(db)
	case "create-indexes":
		createIndexes(db)
	default:
		fmt.Println("Available commands:")
		fmt.Println("  migrate         - Run all pending migrations")
		fmt.Println("  rollback        - Rollback a specific migration (requires -version)")
		fmt.Println("  status          - Show migration status")
		fmt.Println("  auto-migrate    - Run GORM auto-migration for all models")
		fmt.Println("  create-indexes  - Create performance indexes")
		fmt.Println("")
		fmt.Println("Flags:")
		fmt.Println("  -command=<cmd>  - Command to run")
		fmt.Println("  -version=<ver>  - Migration version (for rollback)")
		fmt.Println("  -force          - Skip confirmation prompts")
		fmt.Println("")
		fmt.Println("Examples:")
		fmt.Println("  go run cmd/migrate/main.go -command=migrate")
		fmt.Println("  go run cmd/migrate/main.go -command=rollback -version=002_add_product_indexes")
		fmt.Println("  go run cmd/migrate/main.go -command=status")
		os.Exit(1)
	}
}

func runMigrations(manager *migrations.Manager, force bool) {
	if !force {
		fmt.Print("Are you sure you want to run migrations? [y/N]: ")
		var response string
		fmt.Scanln(&response)
		if response != "y" && response != "Y" {
			fmt.Println("Migration cancelled")
			return
		}
	}

	fmt.Println("🚀 Running database migrations...")
	if err := manager.RunMigrations(); err != nil {
		log.Fatal("Migration failed:", err)
	}
	fmt.Println("✅ Migrations completed successfully!")
}

func rollbackMigration(manager *migrations.Manager, version string, force bool) {
	if version == "" {
		log.Fatal("Version is required for rollback. Use -version=<migration_version>")
	}

	if !force {
		fmt.Printf("Are you sure you want to rollback migration %s? [y/N]: ", version)
		var response string
		fmt.Scanln(&response)
		if response != "y" && response != "Y" {
			fmt.Println("Rollback cancelled")
			return
		}
	}

	fmt.Printf("🔄 Rolling back migration: %s\n", version)
	if err := manager.RollbackMigration(version); err != nil {
		log.Fatal("Rollback failed:", err)
	}
	fmt.Println("✅ Rollback completed successfully!")
}

func showMigrationStatus(manager *migrations.Manager) {
	fmt.Println("📊 Migration Status:")
	fmt.Println("==================")

	migrations, err := manager.GetMigrationStatus()
	if err != nil {
		log.Fatal("Failed to get migration status:", err)
	}

	if len(migrations) == 0 {
		fmt.Println("No migrations found")
		return
	}

	fmt.Printf("%-25s %-15s %-20s %s\n", "VERSION", "STATUS", "EXECUTED AT", "NAME")
	fmt.Println("─────────────────────────────────────────────────────────────────────────────")

	for _, migration := range migrations {
		executedAt := "N/A"
		if migration.ExecutedAt != nil {
			executedAt = migration.ExecutedAt.Format("2006-01-02 15:04:05")
		}

		status := migration.Status
		if migration.RolledBackAt != nil {
			status = "ROLLED_BACK"
		}

		fmt.Printf("%-25s %-15s %-20s %s\n",
			migration.Version,
			status,
			executedAt,
			migration.Name,
		)

		if migration.Error != "" {
			fmt.Printf("    Error: %s\n", migration.Error)
		}
	}
}

func runAutoMigration(db *gorm.DB) {
	fmt.Println("🔄 Running auto-migration...")
	
	autoMigrator := migrations.NewAutoMigrator(db)
	if err := autoMigrator.RunAutoMigration(); err != nil {
		log.Fatal("Auto-migration failed:", err)
	}
	
	fmt.Println("✅ Auto-migration completed successfully!")
}

func createIndexes(db *gorm.DB) {
	fmt.Println("🔍 Creating performance indexes...")
	
	autoMigrator := migrations.NewAutoMigrator(db)
	if err := autoMigrator.CreateIndexes(); err != nil {
		log.Fatal("Index creation failed:", err)
	}
	
	fmt.Println("✅ Indexes created successfully!")
}
