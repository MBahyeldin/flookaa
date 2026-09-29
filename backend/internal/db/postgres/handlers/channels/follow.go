package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

// FollowChannel follows a channel the persona can read. Following twice is
// a no-op, so a retried request still answers "following" and publishes
// nothing the second time.
func (h *Handler) FollowChannel(c *gin.Context) {
	ctx := c.Request.Context()
	personaId, channelId, ok := h.followTarget(c)
	if !ok {
		return
	}

	n, err := h.q.FollowChannel(ctx, db.FollowChannelParams{
		ChannelID: channelId,
		PersonaID: personaId,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n > 0 {
		h.publish(ctx, channelId, personaId, nats.EventFollower, db.EventActionEnumCreate, personaId, nats.ReasonFollowed)
	}
	c.JSON(http.StatusOK, gin.H{"following": true})
}

// UnfollowChannel ends the persona's current follow, if any.
func (h *Handler) UnfollowChannel(c *gin.Context) {
	ctx := c.Request.Context()
	personaId, channelId, ok := h.followTarget(c)
	if !ok {
		return
	}

	n, err := h.q.UnfollowChannel(ctx, db.UnfollowChannelParams{
		ChannelID: channelId,
		PersonaID: personaId,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n > 0 {
		h.publish(ctx, channelId, personaId, nats.EventFollower, db.EventActionEnumDelete, personaId, nats.ReasonUnfollowed)
	}
	c.JSON(http.StatusOK, gin.H{"following": false})
}

// followTarget resolves the persona and :channel_id. Personas that can't read
// the channel (non-members of a private one) get 404, as everywhere else.
func (h *Handler) followTarget(c *gin.Context) (personaId, channelId int64, ok bool) {
	personaId, ok = auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return 0, 0, false
	}

	channelId, ok = channelIDParam(c)
	if !ok {
		return 0, 0, false
	}

	channel, ok := h.loadChannel(c, channelId, personaId)
	if !ok {
		return 0, 0, false
	}
	if !channel.CanRead() {
		c.JSON(http.StatusNotFound, gin.H{"error": access.ErrChannelNotFound.Error()})
		return 0, 0, false
	}
	return personaId, channelId, true
}
