package users

import (
	"app/internal/password"
	"app/util/passwordreset"
	"context"
	"errors"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
)

// ForgotPassword always answers 202 the same way, so it never tells whether an address has an account.
func (h *Handler) ForgotPassword(c *gin.Context) {
	var req struct {
		EmailAddress string `json:"email_address" binding:"required,email,max=255"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_email"})
		return
	}
	email := strings.TrimSpace(req.EmailAddress)

	// Detached from the request so the reply doesn't wait on the database or SMTP.
	go func() {
		to, token, err := h.resets.Request(context.Background(), email)
		if err != nil {
			log.Println("password reset request:", err)
			return
		}
		if token == "" {
			return
		}
		link := h.appBaseURL + "/reset-password?token=" + url.QueryEscape(token)
		if err := h.email.SendPasswordReset(to, link); err != nil {
			log.Println("password reset email:", err)
		}
	}()
	c.JSON(http.StatusAccepted, gin.H{})
}

func (h *Handler) CheckPasswordReset(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_token"})
		return
	}
	err := h.resets.Check(c.Request.Context(), req.Token)
	switch {
	case err == nil:
		c.JSON(http.StatusOK, gin.H{})
	case errors.Is(err, passwordreset.ErrInvalidToken):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_token"})
	default:
		log.Println("check password reset:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset_failed"})
	}
}

func (h *Handler) ResetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_token"})
		return
	}
	if failed := password.Check(req.Password); len(failed) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "weak_password", "failed": failed})
		return
	}
	err := h.resets.Reset(c.Request.Context(), req.Token, req.Password)
	switch {
	case err == nil:
		c.JSON(http.StatusOK, gin.H{})
	case errors.Is(err, passwordreset.ErrInvalidToken):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_token"})
	default:
		log.Println("reset password:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reset_failed"})
	}
}
