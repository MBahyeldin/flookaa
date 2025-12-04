package users

import (
	"app/internal/models"
	"app/util/encryption"
	"app/util/token"
	"database/sql"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

func Create(c *gin.Context) {
	ctx := c.Request.Context()

	var userRequest models.CreateUserRequest
	// Validate the incoming JSON
	if err := c.ShouldBindJSON(&userRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hashedPassword, err := encryption.HashPassword(userRequest.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save to the database
	user := db.CreateUserParams{
		FirstName:      userRequest.FirstName,
		LastName:       userRequest.LastName,
		EmailAddress:   userRequest.EmailAddress,
		Phone:          userRequest.Phone,
		HashedPassword: hashedPassword,
		Thumbnail:      sql.NullString(userRequest.Thumbnail),
	}
	// Use the global DbConn variable
	q := db.New(postgres.DbConn)

	createUser, err := q.CreateUser(ctx, user)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	verificationCode, err := token.Generate(map[string]interface{}{
		"email_address": createUser.EmailAddress,
		"user_id":       createUser.ID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    verificationCode,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   false, // change to true in production
	})
	c.JSON(http.StatusCreated, gin.H{
		"verification_code": verificationCode,
	})
}
