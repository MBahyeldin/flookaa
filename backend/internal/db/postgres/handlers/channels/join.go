package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// JoinChannel allows a user to join a channel.
// It expects the user ID to be set in the context (e.g., via middleware)
// user becomes a member of the channel specified by channel_id in the URL.
func (h *Handler) JoinChannel(c *gin.Context) {
	ctx := c.Request.Context()

	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	channelIdParam := c.Param("channel_id")
	channelId, err := strconv.Atoi(channelIdParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel ID"})
		return
	}
	q := h.q

	channel, err := q.GetChannel(ctx, db.GetChannelParams{
		ID:      int64(channelId),
		OwnerID: personaId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if channel.IsMember || channel.IsOwner {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is already a member of the channel"})
		return
	}

	_, err = q.AddUserToChannel(ctx, db.AddUserToChannelParams{
		ChannelID: int64(channelId),
		PersonaID: personaId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "joined channel successfully"})
}

func (h *Handler) LeaveChannel(c *gin.Context) {
	ctx := c.Request.Context()

	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	channelIdParam := c.Param("channel_id")
	channelId, err := strconv.Atoi(channelIdParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel ID"})
		return
	}
	q := h.q

	channel, err := q.GetChannel(ctx, db.GetChannelParams{
		ID:      int64(channelId),
		OwnerID: personaId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !channel.IsMember {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is not a member of the channel"})
		return
	}

	if channel.IsOwner {
		c.JSON(http.StatusBadRequest, gin.H{"error": "channel owner cannot leave the channel"})
		return
	}

	_, err = q.RemoveUserFromChannel(ctx, db.RemoveUserFromChannelParams{
		ChannelID: int64(channelId),
		PersonaID: personaId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "left channel successfully"})
}
