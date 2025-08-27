package main

import (
	"log"

	"ecommerce-backend/internal/config"
	"ecommerce-backend/internal/database"
	"ecommerce-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()

	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Starting database seeding...")

	// Create admin user
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	adminUser := models.User{
		Email:         "admin@ecommerce.com",
		Password:      string(hashedPassword),
		FirstName:     "Admin",
		LastName:      "User",
		Phone:         "+1234567890",
		Address:       "123 Admin Street",
		City:          "Admin City",
		Country:       "USA",
		PostalCode:    "12345",
		Role:          "admin",
		IsActive:      true,
		EmailVerified: true,
	}

	if err := db.Create(&adminUser).Error; err != nil {
		log.Printf("Admin user might already exist: %v", err)
	} else {
		log.Println("Admin user created successfully")
		log.Println("Email: admin@ecommerce.com")
		log.Println("Password: admin123")
	}

	// Create categories
	categories := []models.Category{
		{Name: "Electronics", Description: "Electronic devices and gadgets", IsActive: true},
		{Name: "Clothing", Description: "Fashion and apparel", IsActive: true},
		{Name: "Books", Description: "Books and educational materials", IsActive: true},
		{Name: "Home & Garden", Description: "Home improvement and garden supplies", IsActive: true},
		{Name: "Sports", Description: "Sports equipment and accessories", IsActive: true},
	}

	for i := range categories {
		if err := db.Create(&categories[i]).Error; err != nil {
			log.Printf("Category %s might already exist", categories[i].Name)
		}
	}

	log.Println("Categories created successfully")

	// Create test products
	products := []models.Product{
		{
			Name:             "iPhone 15 Pro",
			Slug:             "iphone-15-pro",
			Description:      "The latest iPhone with advanced camera system and A17 Pro chip. Perfect for photography enthusiasts and power users.",
			ShortDescription: "Latest iPhone with A17 Pro chip",
			Price:            999.99,
			SKU:              "IPH15PRO001",
			Stock:            50,
			ImageURL:         "https://images.unsplash.com/photo-1592286385-8566f9d8eaca?w=500",
			CategoryID:       1, // Electronics
			Brand:            "Apple",
			Tags:             "smartphone,apple,premium",
			IsFeatured:       true,
			IsActive:         true,
		},
		{
			Name:             "Samsung Galaxy Watch 6",
			Slug:             "samsung-galaxy-watch-6",
			Description:      "Advanced smartwatch with health monitoring, GPS, and long battery life. Track your fitness and stay connected.",
			ShortDescription: "Advanced smartwatch with health monitoring",
			Price:            329.99,
			SKU:              "SGW6001",
			Stock:            30,
			ImageURL:         "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500",
			CategoryID:       1, // Electronics
			Brand:            "Samsung",
			Tags:             "smartwatch,fitness,health",
			IsFeatured:       true,
			IsActive:         true,
		},
		{
			Name:             "Nike Air Max 270",
			Slug:             "nike-air-max-270",
			Description:      "Comfortable running shoes with Max Air cushioning. Perfect for daily workouts and casual wear.",
			ShortDescription: "Comfortable running shoes with Max Air cushioning",
			Price:            150.00,
			SKU:              "NAM270001",
			Stock:            100,
			ImageURL:         "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500",
			CategoryID:       2, // Clothing
			Brand:            "Nike",
			Tags:             "shoes,running,sports,nike",
			IsFeatured:       false,
			IsActive:         true,
		},
		{
			Name:             "MacBook Pro 14-inch",
			Slug:             "macbook-pro-14",
			Description:      "Powerful laptop with M3 chip, perfect for professionals and creatives. Features Liquid Retina XDR display.",
			ShortDescription: "Powerful laptop with M3 chip",
			Price:            1999.99,
			SKU:              "MBP14M3001",
			Stock:            25,
			ImageURL:         "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500",
			CategoryID:       1, // Electronics
			Brand:            "Apple",
			Tags:             "laptop,apple,professional,m3",
			IsFeatured:       true,
			IsActive:         true,
		},
		{
			Name:             "The Complete Guide to Programming",
			Slug:             "complete-guide-programming",
			Description:      "Comprehensive guide covering multiple programming languages and best practices. Perfect for beginners and experienced developers.",
			ShortDescription: "Comprehensive programming guide",
			Price:            49.99,
			SKU:              "BOOK001",
			Stock:            200,
			ImageURL:         "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500",
			CategoryID:       3, // Books
			Brand:            "TechBooks",
			Tags:             "programming,education,book",
			IsFeatured:       false,
			IsActive:         true,
		},
		{
			Name:             "Wireless Bluetooth Headphones",
			Slug:             "wireless-bluetooth-headphones",
			Description:      "High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers.",
			ShortDescription: "High-quality wireless headphones with noise cancellation",
			Price:            199.99,
			SKU:              "WBH001",
			Stock:            75,
			ImageURL:         "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
			CategoryID:       1, // Electronics
			Brand:            "AudioTech",
			Tags:             "headphones,wireless,music,audio",
			IsFeatured:       true,
			IsActive:         true,
		},
		{
			Name:             "Yoga Mat Premium",
			Slug:             "yoga-mat-premium",
			Description:      "High-quality yoga mat with excellent grip and cushioning. Perfect for yoga, pilates, and fitness exercises.",
			ShortDescription: "High-quality yoga mat with excellent grip",
			Price:            79.99,
			SKU:              "YOGA001",
			Stock:            150,
			ImageURL:         "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500",
			CategoryID:       5, // Sports
			Brand:            "FitnessPro",
			Tags:             "yoga,fitness,mat,exercise",
			IsFeatured:       false,
			IsActive:         true,
		},
		{
			Name:             "Smart Home Security Camera",
			Slug:             "smart-home-security-camera",
			Description:      "Advanced security camera with 4K recording, night vision, and mobile app control. Keep your home safe.",
			ShortDescription: "Advanced security camera with 4K recording",
			Price:            249.99,
			SKU:              "SHSC001",
			Stock:            60,
			ImageURL:         "https://images.unsplash.com/photo-1558618644-fce55c9e7cd0?w=500",
			CategoryID:       4, // Home & Garden
			Brand:            "SecureHome",
			Tags:             "security,camera,smart-home,surveillance",
			IsFeatured:       false,
			IsActive:         true,
		},
		{
			Name:             "Designer Leather Wallet",
			Slug:             "designer-leather-wallet",
			Description:      "Premium leather wallet with RFID protection and multiple card slots. Elegant design for everyday use.",
			ShortDescription: "Premium leather wallet with RFID protection",
			Price:            89.99,
			SKU:              "DLW001",
			Stock:            80,
			ImageURL:         "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500",
			CategoryID:       2, // Clothing
			Brand:            "LuxuryLeather",
			Tags:             "wallet,leather,rfid,premium",
			IsFeatured:       false,
			IsActive:         true,
		},
		{
			Name:             "Coffee Maker Deluxe",
			Slug:             "coffee-maker-deluxe",
			Description:      "Professional coffee maker with programmable settings and thermal carafe. Brew the perfect cup every time.",
			ShortDescription: "Professional coffee maker with programmable settings",
			Price:            299.99,
			SKU:              "CMD001",
			Stock:            45,
			ImageURL:         "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500",
			CategoryID:       4, // Home & Garden
			Brand:            "BrewMaster",
			Tags:             "coffee,maker,kitchen,appliance",
			IsFeatured:       true,
			IsActive:         true,
		},
	}

	for i := range products {
		if err := db.Create(&products[i]).Error; err != nil {
			log.Printf("Product %s might already exist", products[i].Name)
		}
	}

	log.Println("Test products created successfully")
	log.Println("Database seeding completed!")
}
