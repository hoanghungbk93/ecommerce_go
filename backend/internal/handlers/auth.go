package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/pkg/auth"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db        *gorm.DB
	jwtSecret string
}

func NewAuthHandler(db *gorm.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret}
}

type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type GoogleLoginRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

type GoogleUserInfo struct {
	Email         string `json:"email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	EmailVerified bool   `json:"email_verified"`
}

type AuthResponse struct {
	User         models.User `json:"user"`
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingUser models.User
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		Email:     req.Email,
		Password:  string(hashedPassword),
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		Address:   req.Address,
		Role:      "user",
		IsActive:  true,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	accessToken, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	refreshTokenString, err := auth.GenerateRefreshToken(user.ID, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	refreshToken := models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}

	if err := h.db.Create(&refreshToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save refresh token"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.Where("email = ? AND is_active = ?", req.Email, true).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	accessToken, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	refreshTokenString, err := auth.GenerateRefreshToken(user.ID, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	refreshToken := models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}

	if err := h.db.Create(&refreshToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save refresh token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var refreshToken models.RefreshToken
	if err := h.db.Where("token = ? AND expires_at > ?", req.RefreshToken, time.Now()).First(&refreshToken).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	var user models.User
	if err := h.db.Where("id = ? AND is_active = ?", refreshToken.UserID, true).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	accessToken, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
		"user":         user,
	})
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("[DEBUG] Received Google login request with token length: %d\n", len(req.IDToken))

	userInfo, err := h.verifyGoogleToken(req.IDToken)
	if err != nil {
		fmt.Printf("[ERROR] Google token verification failed: %v\n", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("Invalid Google token: %v", err)})
		return
	}

	fmt.Printf("[DEBUG] Google token verified successfully for email: %s\n", userInfo.Email)

	if !userInfo.EmailVerified {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email not verified"})
		return
	}

	var user models.User
	err = h.db.Where("email = ?", userInfo.Email).First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			randomPassword := h.generateRandomPassword()
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
				return
			}

			user = models.User{
				Email:         userInfo.Email,
				Password:      string(hashedPassword),
				FirstName:     userInfo.GivenName,
				LastName:      userInfo.FamilyName,
				Role:          "user",
				IsActive:      true,
				EmailVerified: userInfo.EmailVerified,
			}

			if err := h.db.Create(&user).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
	}

	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account is deactivated"})
		return
	}

	accessToken, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	refreshTokenString, err := auth.GenerateRefreshToken(user.ID, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	refreshToken := models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}

	if err := h.db.Create(&refreshToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save refresh token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString,
	})
}

func (h *AuthHandler) verifyGoogleToken(idToken string) (*GoogleUserInfo, error) {
	resp, err := http.Get(fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken))
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google verification failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Google's tokeninfo response has different field names
	var tokenInfo struct {
		Email         string `json:"email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		GivenName     string `json:"given_name"`
		FamilyName    string `json:"family_name"`
		EmailVerified string `json:"email_verified"` // Google returns this as string "true"/"false"
		Aud           string `json:"aud"`             // Client ID
		Iss           string `json:"iss"`             // Issuer
		Exp           string `json:"exp"`             // Expiration
	}

	if err := json.Unmarshal(body, &tokenInfo); err != nil {
		return nil, fmt.Errorf("failed to parse token info: %v", err)
	}

	// Convert to our UserInfo struct
	userInfo := &GoogleUserInfo{
		Email:         tokenInfo.Email,
		Name:          tokenInfo.Name,
		Picture:       tokenInfo.Picture,
		GivenName:     tokenInfo.GivenName,
		FamilyName:    tokenInfo.FamilyName,
		EmailVerified: tokenInfo.EmailVerified == "true",
	}

	return userInfo, nil
}

func (h *AuthHandler) generateRandomPassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	length := 16
	password := make([]byte, length)

	for i := range password {
		b := make([]byte, 1)
		rand.Read(b)
		password[i] = charset[int(b[0])%len(charset)]
	}

	return string(password)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	type LogoutRequest struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.db.Where("token = ?", req.RefreshToken).Delete(&models.RefreshToken{})

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
