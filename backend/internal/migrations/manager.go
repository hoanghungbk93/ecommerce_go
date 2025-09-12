package migrations

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

type Migration struct {
	ID          uint      `gorm:"primaryKey"`
	Version     string    `gorm:"uniqueIndex;not null"`
	Name        string    `gorm:"not null"`
	Status      string    `gorm:"default:pending"`
	ExecutedAt  *time.Time
	RolledBackAt *time.Time
	Error       string
	CreatedAt   time.Time
}

type MigrationFunc func(db *gorm.DB) error
type RollbackFunc func(db *gorm.DB) error

type MigrationStep struct {
	Version     string
	Name        string
	Up          MigrationFunc
	Down        RollbackFunc
	Description string
}

type Manager struct {
	db         *gorm.DB
	migrations []MigrationStep
}

func NewManager(db *gorm.DB) *Manager {
	// Create migrations table if it doesn't exist
	if err := db.AutoMigrate(&Migration{}); err != nil {
		log.Printf("Failed to create migrations table: %v", err)
	}

	return &Manager{
		db:         db,
		migrations: []MigrationStep{},
	}
}

func (m *Manager) AddMigration(step MigrationStep) {
	m.migrations = append(m.migrations, step)
}

func (m *Manager) RunMigrations() error {
	log.Println("🚀 Starting database migrations...")

	for _, migration := range m.migrations {
		// Check if migration already executed
		var existingMigration Migration
		if err := m.db.Where("version = ?", migration.Version).First(&existingMigration).Error; err == nil {
			if existingMigration.Status == "success" {
				log.Printf("⏭️  Migration %s already executed, skipping...", migration.Version)
				continue
			}
		}

		log.Printf("🔧 Running migration: %s - %s", migration.Version, migration.Name)

		// Record migration start
		migrationRecord := Migration{
			Version:   migration.Version,
			Name:      migration.Name,
			Status:    "running",
			CreatedAt: time.Now(),
		}

		if err := m.db.Create(&migrationRecord).Error; err != nil {
			log.Printf("❌ Failed to create migration record: %v", err)
			continue
		}

		// Execute migration
		if err := migration.Up(m.db); err != nil {
			// Update migration record with error
			migrationRecord.Status = "failed"
			migrationRecord.Error = err.Error()
			m.db.Save(&migrationRecord)
			
			log.Printf("❌ Migration %s failed: %v", migration.Version, err)
			return fmt.Errorf("migration %s failed: %v", migration.Version, err)
		}

		// Update migration record with success
		now := time.Now()
		migrationRecord.Status = "success"
		migrationRecord.ExecutedAt = &now
		m.db.Save(&migrationRecord)

		log.Printf("✅ Migration %s completed successfully", migration.Version)
	}

	log.Println("🎉 All migrations completed successfully!")
	return nil
}

func (m *Manager) RollbackMigration(version string) error {
	var migration Migration
	if err := m.db.Where("version = ? AND status = ?", version, "success").First(&migration).Error; err != nil {
		return fmt.Errorf("migration %s not found or not executed", version)
	}

	// Find the migration step
	var migrationStep *MigrationStep
	for _, step := range m.migrations {
		if step.Version == version {
			migrationStep = &step
			break
		}
	}

	if migrationStep == nil || migrationStep.Down == nil {
		return fmt.Errorf("rollback function not found for migration %s", version)
	}

	log.Printf("🔄 Rolling back migration: %s - %s", version, migration.Name)

	// Execute rollback
	if err := migrationStep.Down(m.db); err != nil {
		log.Printf("❌ Rollback failed for %s: %v", version, err)
		return fmt.Errorf("rollback failed: %v", err)
	}

	// Update migration record
	now := time.Now()
	migration.RolledBackAt = &now
	migration.Status = "rolled_back"
	m.db.Save(&migration)

	log.Printf("✅ Migration %s rolled back successfully", version)
	return nil
}

func (m *Manager) GetMigrationStatus() ([]Migration, error) {
	var migrations []Migration
	if err := m.db.Order("created_at asc").Find(&migrations).Error; err != nil {
		return nil, err
	}
	return migrations, nil
}

func (m *Manager) IsMigrationExecuted(version string) bool {
	var migration Migration
	err := m.db.Where("version = ? AND status = ?", version, "success").First(&migration).Error
	return err == nil
}
