package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

func (h *Handler) SetChannelMinAge(c *gin.Context) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	channelId, ok := channelIDParam(c)
	if !ok {
		return
	}
	channel, ok := h.loadChannel(c, channelId, personaId)
	if !ok {
		return
	}
	if !channel.CanModerate {
		if !channel.CanRead() {
			c.JSON(http.StatusNotFound, gin.H{"error": access.ErrChannelNotFound.Error()})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "not_moderator"})
		return
	}
	var in struct {
		MinAge *int16 `json:"min_age"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.MinAge == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_min_age"})
		return
	}
	ctx := c.Request.Context()
	if ok, err := access.ValidMinAge(ctx, h.q, personaId, *in.MinAge); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_min_age"})
		return
	}
	if err := h.q.SetChannelMinAge(ctx, db.SetChannelMinAgeParams{ID: channelId, MinAge: *in.MinAge}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.publish(ctx, channelId, personaId, nats.EventChannelInfo, db.EventActionEnumUpdate, 0, "")
	c.JSON(http.StatusOK, gin.H{"min_age": *in.MinAge})
}
