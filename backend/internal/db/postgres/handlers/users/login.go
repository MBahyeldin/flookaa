package users

import (
	"app/internal/models"
	"app/util/encryption"
	"app/util/token"
	"fmt"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
	fmt.Println("Login endpoint hit")

	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx := c.Request.Context()
	q := db.New(postgres.DbConn)
	user, err := q.GetUserHashedPasswordByEmail(ctx, req.EmailAddress)
	if err != nil {
		fmt.Println("Error fetching user:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !encryption.CheckPasswordHash(req.Password, user.HashedPassword) {
		fmt.Println("Invalid password for user:", req.EmailAddress)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := token.Generate(map[string]interface{}{
		"user_id":       user.ID,
		"email_address": user.EmailAddress,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    token,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   false, // change to true in production
	})
	c.JSON(http.StatusOK, gin.H{"login": "successful", "token": token})
}
