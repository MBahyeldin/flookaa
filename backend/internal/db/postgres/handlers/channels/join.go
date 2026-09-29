package channels

import (
	"app/internal/auth"
	"errors"
	"net/http"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// JoinChannel makes the persona a member of a public channel, or files a
// pending join request for a private one that a moderator must approve.
func (h *Handler) JoinChannel(c *gin.Context) {
	ctx := c.Request.Context()

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

	if channel.IsMember {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is already a member of the channel"})
		return
	}
	if channel.IsPending {
		c.JSON(http.StatusAccepted, gin.H{"status": "pending", "message": "join request already sent"})
		return
	}

	status := db.ChannelMembershipStatusEnumActive
	if channel.IsPrivate() {
		status = db.ChannelMembershipStatusEnumPending
	}

	_, err := h.q.AddUserToChannel(ctx, db.AddUserToChannelParams{
		ChannelID: channelId,
		PersonaID: personaId,
		Status:    status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if status == db.ChannelMembershipStatusEnumPending {
		c.JSON(http.StatusAccepted, gin.H{"status": "pending", "message": "join request sent"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "active", "message": "joined channel successfully"})
}

// LeaveChannel ends a membership, or cancels a pending join request.
func (h *Handler) LeaveChannel(c *gin.Context) {
	ctx := c.Request.Context()

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

	if !channel.IsMember && !channel.IsPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is not a member of the channel"})
		return
	}

	if channel.IsOwner {
		c.JSON(http.StatusBadRequest, gin.H{"error": "channel owner cannot leave the channel"})
		return
	}

	_, err := h.q.RemoveUserFromChannel(ctx, db.RemoveUserFromChannelParams{
		ChannelID: channelId,
		PersonaID: personaId,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "left channel successfully"})
}

func channelIDParam(c *gin.Context) (int64, bool) {
	channelId, err := strconv.ParseInt(c.Param("channel_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel ID"})
		return 0, false
	}
	return channelId, true
}

// loadChannel writes 404 for a missing channel and 500 for other errors.
func (h *Handler) loadChannel(c *gin.Context, channelId, personaId int64) (access.Channel, bool) {
	channel, err := access.LoadChannel(c.Request.Context(), h.q, channelId, personaId)
	if errors.Is(err, access.ErrChannelNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return access.Channel{}, false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return access.Channel{}, false
	}
	return channel, true
}
