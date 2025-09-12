package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Email       string         `json:"email" gorm:"uniqueIndex;not null"`
	Password    string         `json:"-" gorm:"not null"`
	FirstName   string         `json:"first_name"`
	LastName    string         `json:"last_name"`
	Phone       string         `json:"phone"`
	Address     string         `json:"address"`
	City        string         `json:"city"`
	Country     string         `json:"country"`
	PostalCode  string         `json:"postal_code"`
	Role        string         `json:"role" gorm:"default:customer"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	EmailVerified bool         `json:"email_verified" gorm:"default:false"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Orders      []Order        `json:"orders,omitempty" gorm:"foreignKey:UserID"`
}

type Category struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null;uniqueIndex"`
	Description string         `json:"description"`
	ImageURL    string         `json:"image_url"`
	ParentID    *uint          `json:"parent_id"`
	Parent      *Category      `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children    []Category     `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Products    []Product      `json:"products,omitempty" gorm:"foreignKey:CategoryID"`
}

type Product struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	Name            string         `json:"name" gorm:"not null"`
	Slug            string         `json:"slug" gorm:"uniqueIndex;not null"`
	Description     string         `json:"description"`
	ShortDescription string        `json:"short_description"`
	Price           float64        `json:"price" gorm:"not null"`
	SalePrice       *float64       `json:"sale_price"`
	SKU             string         `json:"sku" gorm:"uniqueIndex"`
	Stock           int            `json:"stock" gorm:"default:0"`
	MinStock        int            `json:"min_stock" gorm:"default:0"`
	Weight          *float64       `json:"weight"`
	Dimensions      string         `json:"dimensions"`
	ImageURL        string         `json:"image_url"`
	Images          []ProductImage `json:"images,omitempty" gorm:"foreignKey:ProductID"`
	CategoryID      uint           `json:"category_id"`
	Category        Category       `json:"category" gorm:"foreignKey:CategoryID"`
	Brand           string         `json:"brand"`
	Tags            string         `json:"tags"`
	IsFeatured      bool           `json:"is_featured" gorm:"default:false"`
	IsActive        bool           `json:"is_active" gorm:"default:true"`
	ViewCount       int            `json:"view_count" gorm:"default:0"`
	Rating          float64        `json:"rating" gorm:"default:0"`
	ReviewCount     int            `json:"review_count" gorm:"default:0"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
	Reviews         []ProductReview `json:"reviews,omitempty" gorm:"foreignKey:ProductID"`
}

type ProductImage struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	ProductID uint   `json:"product_id" gorm:"not null"`
	ImageURL  string `json:"image_url" gorm:"not null"`
	AltText   string `json:"alt_text"`
	IsPrimary bool   `json:"is_primary" gorm:"default:false"`
	SortOrder int    `json:"sort_order" gorm:"default:0"`
}

type ProductReview struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ProductID uint      `json:"product_id" gorm:"not null"`
	Product   Product   `json:"product" gorm:"foreignKey:ProductID"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	Rating    int       `json:"rating" gorm:"not null;check:rating >= 1 AND rating <= 5"`
	Title     string    `json:"title"`
	Comment   string    `json:"comment"`
	IsVerified bool     `json:"is_verified" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Cart struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id" gorm:"not null;uniqueIndex"`
	User      User       `json:"user" gorm:"foreignKey:UserID"`
	Items     []CartItem `json:"items" gorm:"foreignKey:CartID"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type CartItem struct {
	ID        uint    `json:"id" gorm:"primaryKey"`
	CartID    uint    `json:"cart_id" gorm:"not null"`
	ProductID uint    `json:"product_id" gorm:"not null"`
	Product   Product `json:"product" gorm:"foreignKey:ProductID"`
	Quantity  int     `json:"quantity" gorm:"not null;check:quantity > 0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Order struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	OrderNumber     string         `json:"order_number" gorm:"uniqueIndex;not null"`
	UserID          uint           `json:"user_id" gorm:"not null"`
	User            User           `json:"user" gorm:"foreignKey:UserID"`
	Status          string         `json:"status" gorm:"default:pending"`
	PaymentStatus   string         `json:"payment_status" gorm:"default:pending"`
	PaymentMethod   string         `json:"payment_method"`
	Subtotal        float64        `json:"subtotal" gorm:"not null"`
	TaxAmount       float64        `json:"tax_amount" gorm:"default:0"`
	ShippingCost    float64        `json:"shipping_cost" gorm:"default:0"`
	DiscountAmount  float64        `json:"discount_amount" gorm:"default:0"`
	Total           float64        `json:"total" gorm:"not null"`
	Currency        string         `json:"currency" gorm:"default:VND"`
	Notes           string         `json:"notes"`
	ShippingAddress ShippingAddress `json:"shipping_address" gorm:"foreignKey:OrderID"`
	Items           []OrderItem     `json:"items" gorm:"foreignKey:OrderID"`
	Payments        []Payment       `json:"payments,omitempty" gorm:"foreignKey:OrderID"`
	OrderDate       time.Time       `json:"order_date"`
	ShippedAt       *time.Time      `json:"shipped_at"`
	DeliveredAt     *time.Time      `json:"delivered_at"`
	CancelledAt     *time.Time      `json:"cancelled_at"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	DeletedAt       gorm.DeletedAt  `json:"-" gorm:"index"`
}

type OrderItem struct {
	ID         uint    `json:"id" gorm:"primaryKey"`
	OrderID    uint    `json:"order_id" gorm:"not null"`
	ProductID  uint    `json:"product_id" gorm:"not null"`
	Product    Product `json:"product" gorm:"foreignKey:ProductID"`
	Quantity   int     `json:"quantity" gorm:"not null;check:quantity > 0"`
	UnitPrice  float64 `json:"unit_price" gorm:"not null"`
	TotalPrice float64 `json:"total_price" gorm:"not null"`
}

type ShippingAddress struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	OrderID    uint   `json:"order_id" gorm:"not null;uniqueIndex"`
	FirstName  string `json:"first_name" gorm:"not null"`
	LastName   string `json:"last_name" gorm:"not null"`
	Company    string `json:"company"`
	Address1   string `json:"address1" gorm:"not null"`
	Address2   string `json:"address2"`
	City       string `json:"city" gorm:"not null"`
	State      string `json:"state"`
	PostalCode string `json:"postal_code" gorm:"not null"`
	Country    string `json:"country" gorm:"not null"`
	Phone      string `json:"phone"`
}

type Payment struct {
	ID              uint           `json:"id" gorm:"primaryKey"`
	OrderID         uint           `json:"order_id" gorm:"not null"`
	Order           Order          `json:"order" gorm:"foreignKey:OrderID"`
	PaymentMethod   string         `json:"payment_method" gorm:"not null"`
	Status          string         `json:"status" gorm:"default:pending"`
	Amount          float64        `json:"amount" gorm:"not null"`
	Currency        string         `json:"currency" gorm:"default:VND"`
	TransactionID   string         `json:"transaction_id"`
	GatewayResponse string         `json:"gateway_response,omitempty"`
	ProcessedAt     *time.Time     `json:"processed_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
}

type Coupon struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	Code             string         `json:"code" gorm:"uniqueIndex;not null"`
	Type             string         `json:"type" gorm:"not null"`
	Value            float64        `json:"value" gorm:"not null"`
	MinimumAmount    *float64       `json:"minimum_amount"`
	MaximumDiscount  *float64       `json:"maximum_discount"`
	UsageLimit       *int           `json:"usage_limit"`
	UsedCount        int            `json:"used_count" gorm:"default:0"`
	IsActive         bool           `json:"is_active" gorm:"default:true"`
	StartDate        time.Time      `json:"start_date"`
	EndDate          time.Time      `json:"end_date"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`
}

type Partner struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null"`
	Email       string         `json:"email" gorm:"uniqueIndex;not null"`
	APIKey      string         `json:"api_key" gorm:"uniqueIndex;not null"`
	SecretKey   string         `json:"-" gorm:"not null"`
	WebhookURL  string         `json:"webhook_url"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CommissionRate float64     `json:"commission_rate" gorm:"default:0"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type RefreshToken struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	Token     string    `json:"token" gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

type AuditLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    *uint     `json:"user_id"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Action    string    `json:"action" gorm:"not null"`
	Resource  string    `json:"resource" gorm:"not null"`
	ResourceID string   `json:"resource_id"`
	OldValues string    `json:"old_values,omitempty"`
	NewValues string    `json:"new_values,omitempty"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}
