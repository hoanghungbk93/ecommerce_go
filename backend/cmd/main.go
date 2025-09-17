package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"ecommerce-backend/internal/config"
	"ecommerce-backend/internal/database"
	"ecommerce-backend/internal/handlers"
	"ecommerce-backend/internal/middleware"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	cfg := config.Load()

	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
	AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001", "http://ecommerce.itmf.com.vn", "https://ecommerce.itmf.com.vn", "http://api-ecommerce.itmf.com.vn", "https://api-ecommerce.itmf.com.vn", "http://monitoring-ecommerce.itmf.com.vn", "https://monitoring-ecommerce.itmf.com.vn", "http://dev-ecommerce-alb-449822621.ap-southeast-1.elb.amazonaws.com", "http://dev-ecommerce-ec2-alb-1397175522.ap-southeast-1.elb.amazonaws.com"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "message": "E-commerce API is running"})
	})

	api := r.Group("/api/v1")
	
	authHandler := handlers.NewAuthHandler(db, cfg.JWTSecret)
	userHandler := handlers.NewUserHandler(db)
	productHandler := handlers.NewProductHandler(db)
	categoryHandler := handlers.NewCategoryHandler(db)
	cartHandler := handlers.NewCartHandler(db)
	orderHandler := handlers.NewOrderHandler(db)
	paymentHandler := handlers.NewPaymentHandler(db, cfg)
	partnerHandler := handlers.NewPartnerHandler(db)
	webhookProxy := handlers.NewWebhookProxy(cfg)

	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/google", authHandler.GoogleLogin)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Logout)
	}

	users := api.Group("/users")
	users.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		users.GET("/profile", userHandler.GetProfile)
		users.PUT("/profile", userHandler.UpdateProfile)
	}

	adminUsers := api.Group("/admin/users")
	adminUsers.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.AdminMiddleware())
	{
		adminUsers.GET("", userHandler.GetAllUsers)
		adminUsers.GET("/:id", userHandler.GetUser)
		adminUsers.PUT("/:id", userHandler.UpdateUser)
		adminUsers.PUT("/:id/password", userHandler.ChangeUserPassword)
		adminUsers.DELETE("/:id", userHandler.DeleteUser)
	}

	products := api.Group("/products")
	{
		products.GET("", productHandler.GetProducts)
		products.GET("/:id", productHandler.GetProduct)
	}

	categories := api.Group("/categories")
	{
		categories.GET("", categoryHandler.GetCategories)
	}

	cart := api.Group("/cart")
	cart.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		cart.GET("", cartHandler.GetCart)
		cart.POST("/add", cartHandler.AddToCart)
		cart.PUT("/items/:itemId", cartHandler.UpdateCartItem)
		cart.DELETE("/items/:itemId", cartHandler.RemoveFromCart)
		cart.DELETE("/clear", cartHandler.ClearCart)
	}

	protectedProducts := api.Group("/admin/products")
	protectedProducts.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.AdminMiddleware())
	{
		protectedProducts.GET("/pending", productHandler.GetPendingProducts)
		protectedProducts.POST("", productHandler.CreateProduct)
		protectedProducts.PUT("/:id", productHandler.UpdateProduct)
		protectedProducts.POST("/:id/approve", productHandler.ApproveProduct)
		protectedProducts.DELETE("/:id", productHandler.DeleteProduct)
	}

	adminCategories := api.Group("/admin/categories")
	adminCategories.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.AdminMiddleware())
	{
		adminCategories.GET("", categoryHandler.GetAllCategories)
		adminCategories.GET("/:id", categoryHandler.GetCategory)
		adminCategories.POST("", categoryHandler.CreateCategory)
		adminCategories.PUT("/:id", categoryHandler.UpdateCategory)
		adminCategories.DELETE("/:id", categoryHandler.DeleteCategory)
	}

	orders := api.Group("/orders")
	orders.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		orders.GET("", orderHandler.GetUserOrders)
		orders.GET("/:id", orderHandler.GetOrder)
		orders.POST("", orderHandler.CreateOrder)
	}

	adminOrders := api.Group("/admin/orders")
	adminOrders.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.AdminMiddleware())
	{
		adminOrders.GET("", orderHandler.GetAllOrders)
		adminOrders.PUT("/:id/status", orderHandler.UpdateOrderStatus)
	}

	adminPartners := api.Group("/admin/partners")
	adminPartners.Use(middleware.AuthMiddleware(cfg.JWTSecret), middleware.AdminMiddleware())
	{
		adminPartners.GET("", partnerHandler.GetAllPartners)
		adminPartners.GET("/:id", partnerHandler.GetPartner)
		adminPartners.POST("", partnerHandler.CreatePartner)
		adminPartners.PUT("/:id", partnerHandler.UpdatePartner)
		adminPartners.DELETE("/:id", partnerHandler.DeletePartner)
		adminPartners.PATCH("/:id/toggle-status", partnerHandler.TogglePartnerStatus)
		adminPartners.POST("/:id/regenerate-keys", partnerHandler.RegenerateAPIKeys)
	}

	payments := api.Group("/payments")
	payments.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		payments.POST("/vnpay/create", paymentHandler.CreateVNPayPayment)
		payments.GET("/vnpay/return", paymentHandler.VNPayReturn)
	}

	api.POST("/webhooks/vnpay", webhookProxy.HandleVNPayWebhook)
	api.POST("/webhooks/vnpay/direct", paymentHandler.VNPayWebhook)

	partners := api.Group("/partners")
	partners.Use(middleware.PartnerAuthMiddleware(db))
	{
		partners.GET("/products", partnerHandler.GetProducts)
		partners.POST("/products", partnerHandler.CreateProduct)
		partners.PUT("/products/:id", partnerHandler.UpdateProduct)
	}

	api.POST("/webhooks/partner/payment", middleware.PartnerAuthMiddleware(db), partnerHandler.PaymentWebhook)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
