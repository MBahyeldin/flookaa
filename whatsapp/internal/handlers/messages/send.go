package messages

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"
	"whatsapp/internal/whatsapp"
	"whatsapp/util/phone"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// maxTextLength is WhatsApp's practical limit for a text message body.
const maxTextLength = 65536

// sendTimeout bounds a single send, including the IsOnWhatsApp round trip.
const sendTimeout = 60 * time.Second

type SendRequest struct {
	To   string `json:"to" binding:"required"`
	Text string `json:"text" binding:"required"`
	// MessageID is optional. Supplying a stable value makes a retry
	// idempotent, because WhatsApp deduplicates by message ID.
	MessageID string `json:"message_id"`
}

// Handler holds the dependencies of the send endpoint.
type Handler struct {
	svc     *whatsapp.Service
	limiter *rate.Limiter
}

func NewHandler(svc *whatsapp.Service, sendRate float64, burst int) *Handler {
	return &Handler{
		svc: svc,
		// A single instance means an in-process limiter is exactly correct
		// rather than an approximation. It exists to stop a runaway caller
		// loop from getting the WhatsApp account banned.
		limiter: rate.NewLimiter(rate.Limit(sendRate), burst),
	}
}

func (h *Handler) Send(c *gin.Context) {
	var req SendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Text) > maxTextLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "text exceeds the maximum message length"})
		return
	}

	digits, err := phone.Normalize(req.To)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !h.svc.Ready() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":  "not_connected",
			"detail": "whatsapp is not linked or not connected; scan the QR code printed in the service logs",
		})
		return
	}

	if !h.limiter.Allow() {
		c.Header("Retry-After", "1")
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate_limited"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), sendTimeout)
	defer cancel()

	started := time.Now()
	result, err := h.svc.SendText(ctx, digits, req.Text, req.MessageID)
	if err != nil {
		switch {
		case errors.Is(err, whatsapp.ErrNotOnWhatsApp):
			log.Printf("send rejected to=%s reason=not_on_whatsapp text=%q", phone.Mask(digits), req.Text)
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "not_on_whatsapp"})
		case errors.Is(err, whatsapp.ErrNotConnected):
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "not_connected"})
		default:
			log.Printf("send failed to=%s err=%v text=%q", phone.Mask(digits), err, req.Text)
			c.JSON(http.StatusBadGateway, gin.H{"error": "send_failed", "detail": err.Error()})
		}
		return
	}

	log.Printf("sent to=%s id=%s in=%s text=%q", phone.Mask(digits), result.ID, time.Since(started).Round(time.Millisecond), req.Text)
	c.JSON(http.StatusCreated, result)
}
