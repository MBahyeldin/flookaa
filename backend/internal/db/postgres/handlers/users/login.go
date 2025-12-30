package users

import (
	"app/internal/models"
	"app/util/encryption"
	"fmt"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"shared/util/token"

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

	if !user.HashedPassword.Valid || user.HashedPassword.String == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "you can't login with password, please use OAuth login"})
		return
	}

	if !encryption.CheckPasswordHash(req.Password, user.HashedPassword.String) {
		fmt.Println("Invalid password for user:", req.EmailAddress)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	defaultPersona, err := q.GetDefaultPersonaByUserId(ctx, user.ID)
	if err != nil {
		fmt.Println("Error fetching default persona:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user persona"})
		return
	}

	token, err := GetLoginToken(UserMinimal{ID: user.ID, EmailAddress: user.EmailAddress, PersonaId: defaultPersona.ID})
	if err != nil {
		fmt.Println("Error generating token:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    token,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   true,
		Domain:   "flookaa.com",
		SameSite: http.SameSiteNoneMode,
	})
	c.JSON(http.StatusOK, gin.H{"login": "successful", "token": token})

}

type UserMinimal struct {
	ID           int64
	EmailAddress string
	PersonaId    int64
}

func GetLoginToken(user UserMinimal) (string, error) {

	// Generate JWT token
	tokenStr, err := token.Generate(map[string]interface{}{
		"user_id":       user.ID,
		"email_address": user.EmailAddress,
		"persona_id":    user.PersonaId,
	})

	if err != nil {
		return "", err
	}

	return tokenStr, nil
}
