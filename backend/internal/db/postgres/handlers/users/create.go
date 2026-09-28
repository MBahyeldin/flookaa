package users

import (
	"app/internal/models"
	"app/util/cookies"
	"app/util/encryption"
	"database/sql"
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Create(c *gin.Context) {
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
		HashedPassword: sql.NullString{String: hashedPassword, Valid: true},
		Thumbnail:      sql.NullString(userRequest.Thumbnail),
	}
	// Use the global DbConn variable
	q := h.q

	createUser, err := q.CreateUser(ctx, user)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	jwt, err := h.LoginToken(UserMinimal{ID: createUser.ID, EmailAddress: createUser.EmailAddress})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cookies.AddCookieToContext(c, "jwt", jwt)

	verificationCode, err := h.verification.CreateVerificationCode(createUser.ID)

	err = h.email.SendEmail(createUser.EmailAddress, verificationCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send verification email"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully. Please check your email to verify your account.",
	})
}
