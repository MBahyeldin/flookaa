package notifications

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

const maxReadIDs = 100

// UnreadCount is the badge: unread notifications the persona may see.
func (h *Handler) UnreadCount(c *gin.Context) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	count, err := h.q.CountUnreadNotifications(c.Request.Context(), personaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

type MarkReadRequest struct {
	IDs []int64 `json:"ids" binding:"required,min=1"`
}

// MarkRead marks some of the persona's notifications read. Ids of other
// personas' notifications are ignored, not an error.
func (h *Handler) MarkRead(c *gin.Context) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	var req MarkReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids is required"})
		return
	}
	if len(req.IDs) > maxReadIDs {
		c.JSON(http.StatusBadRequest, gin.H{"error": "too many ids"})
		return
	}

	updated, err := h.q.MarkNotificationsRead(c.Request.Context(), db.MarkNotificationsReadParams{
		RecipientID: personaId,
		Ids:         req.IDs,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": updated})
}

// MarkAllRead marks every notification of the persona read.
func (h *Handler) MarkAllRead(c *gin.Context) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	updated, err := h.q.MarkAllNotificationsRead(c.Request.Context(), personaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": updated})
}
