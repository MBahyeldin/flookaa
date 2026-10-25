package users

import (
	"app/internal/models"
	"app/internal/password"
	"app/util/cookies"
	"app/util/encryption"
	"database/sql"
	"log"
	"net/http"
	"shared/external/db/postgres"
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
	if failed := password.Check(userRequest.Password); len(failed) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "weak_password", "failed": failed})
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
	if postgres.IsUniqueViolation(err, "users_email_address_key") {
		c.JSON(http.StatusConflict, gin.H{"error": "email_taken"})
		return
	}
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

	// The account exists either way; on failure the verify step offers Resend.
	emailSent := false
	verificationCode, err := h.verification.Create(ctx, createUser.ID)
	if err == nil {
		err = h.email.SendVerification(createUser.EmailAddress, verificationCode)
	}
	if err != nil {
		log.Println("verification email:", err)
	} else {
		emailSent = true
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "User created successfully. Please check your email to verify your account.",
		"email_sent": emailSent,
	})
}
