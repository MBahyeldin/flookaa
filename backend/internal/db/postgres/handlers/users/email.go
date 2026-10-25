package users

import (
	"app/internal/auth"
	"app/util/cookies"
	"app/util/emailchange"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) RequestEmailChange(c *gin.Context) {
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}
	var req struct {
		EmailAddress string `json:"email_address" binding:"required,email,max=255"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_email"})
		return
	}
	newEmail := strings.TrimSpace(req.EmailAddress)

	code, err := h.emailChange.Request(c.Request.Context(), userId, newEmail)
	var cooldown *emailchange.CooldownError
	switch {
	case err == nil:
	case errors.As(err, &cooldown):
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "resend_cooldown", "retry_after": cooldown.RetryAfter})
		return
	case errors.Is(err, emailchange.ErrSameEmail), errors.Is(err, emailchange.ErrManagedByGoogle):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	case errors.Is(err, emailchange.ErrEmailTaken):
		c.JSON(http.StatusConflict, gin.H{"error": "email_taken"})
		return
	case errors.Is(err, emailchange.ErrUserNotFound):
		auth.Unauthorized(c)
		return
	default:
		log.Println("request email change:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "email_change_failed"})
		return
	}

	if err := h.email.SendEmailChangeCode(newEmail, code); err != nil {
		log.Println("email change code:", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "email_failed", "retry_after": emailchange.ResendCooldownSeconds})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"retry_after": emailchange.ResendCooldownSeconds})
}

func (h *Handler) ConfirmEmailChange(c *gin.Context) {
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_code"})
		return
	}

	oldEmail, newEmail, err := h.emailChange.Confirm(c.Request.Context(), userId, req.Code)
	var invalid *emailchange.InvalidCodeError
	switch {
	case err == nil:
	case errors.As(err, &invalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_code", "attempts_left": invalid.AttemptsLeft})
		return
	case errors.Is(err, emailchange.ErrCodeExpired):
		c.JSON(http.StatusBadRequest, gin.H{"error": "code_expired"})
		return
	case errors.Is(err, emailchange.ErrEmailTaken):
		c.JSON(http.StatusConflict, gin.H{"error": "email_taken"})
		return
	case errors.Is(err, emailchange.ErrUserNotFound):
		auth.Unauthorized(c)
		return
	default:
		log.Println("confirm email change:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "email_change_failed"})
		return
	}

	personaId, _ := auth.PersonaID(c)
	token, err := h.LoginToken(UserMinimal{ID: userId, EmailAddress: newEmail, PersonaId: personaId, EmailVerified: auth.EmailVerified(c)})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	cookies.AddCookieToContext(c, "jwt", token)

	go func() {
		if err := h.email.SendEmailChanged(oldEmail, newEmail); err != nil {
			log.Println("email changed notice:", err)
		}
	}()
	c.JSON(http.StatusOK, gin.H{"email_address": newEmail})
}

func (h *Handler) CancelEmailChange(c *gin.Context) {
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}
	if err := h.emailChange.Cancel(c.Request.Context(), userId); err != nil {
		log.Println("cancel email change:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "email_change_failed"})
		return
	}
	c.Status(http.StatusNoContent)
}
