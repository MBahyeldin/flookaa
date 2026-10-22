package users

import (
	"app/internal/auth"
	"app/internal/models"
	"app/util/cookies"
	"app/util/verification"
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Verify(c *gin.Context) {
	var req models.VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	err := h.verification.Verify(c.Request.Context(), userId, req.VerificationCode)
	var invalid *verification.InvalidCodeError
	switch {
	case err == nil, errors.Is(err, verification.ErrAlreadyVerified):
		if !h.refreshVerifiedToken(c, userId, true) {
			return
		}
		c.JSON(http.StatusOK, gin.H{"verified": true})
	case errors.As(err, &invalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_code", "attempts_left": invalid.AttemptsLeft})
	case errors.Is(err, verification.ErrCodeExpired):
		c.JSON(http.StatusBadRequest, gin.H{"error": "code_expired"})
	case errors.Is(err, verification.ErrUserNotFound):
		auth.Unauthorized(c)
	default:
		log.Println("verify:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verification_failed"})
	}
}

func (h *Handler) ResendVerification(c *gin.Context) {
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	code, err := h.verification.Resend(c.Request.Context(), userId)
	var cooldown *verification.CooldownError
	switch {
	case err == nil:
	case errors.As(err, &cooldown):
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "resend_cooldown", "retry_after": cooldown.RetryAfter})
		return
	case errors.Is(err, verification.ErrAlreadyVerified):
		c.JSON(http.StatusConflict, gin.H{"error": "already_verified"})
		return
	case errors.Is(err, verification.ErrUserNotFound):
		auth.Unauthorized(c)
		return
	default:
		log.Println("resend verification:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "resend_failed"})
		return
	}

	user, err := h.q.GetUserBasicInfo(c.Request.Context(), userId)
	if err == nil {
		err = h.email.SendEmail(user.EmailAddress, code)
	}
	if err != nil {
		log.Println("resend verification email:", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "email_failed", "retry_after": verification.ResendCooldownSeconds})
		return
	}
	c.JSON(http.StatusOK, gin.H{"retry_after": verification.ResendCooldownSeconds})
}

// refreshVerifiedToken reissues the session cookie when its email_verified
// claim differs from verified, keeping the chosen persona.
func (h *Handler) refreshVerifiedToken(c *gin.Context, userId int64, verified bool) bool {
	if auth.EmailVerified(c) == verified {
		return true
	}
	personaId, _ := auth.PersonaID(c)
	token, err := h.LoginToken(UserMinimal{ID: userId, EmailAddress: auth.Email(c), PersonaId: personaId, EmailVerified: verified})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return false
	}
	cookies.AddCookieToContext(c, "jwt", token)
	return true
}
