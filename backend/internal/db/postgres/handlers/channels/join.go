package channels

import (
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// JoinChannel allows a user to join a channel.
// It expects the user ID to be set in the context (e.g., via middleware)
// user becomes a member of the channel specified by channel_id in the URL.
func JoinChannel(c *gin.Context) {
	ctx := c.Request.Context()

	personaId, exists := c.Get("persona_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	channelIdParam := c.Param("channel_id")
	channelId, err := strconv.Atoi(channelIdParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel ID"})
		return
	}
	q := db.New(postgres.DbConn)

	channel, err := q.GetChannel(ctx, db.GetChannelParams{
		ID:      int64(channelId),
		OwnerID: personaId.(int64),
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
		PersonaID: personaId.(int64),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "joined channel successfully"})
}

func LeaveChannel(c *gin.Context) {
	ctx := c.Request.Context()

	personaId, exists := c.Get("persona_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	channelIdParam := c.Param("channel_id")
	channelId, err := strconv.Atoi(channelIdParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel ID"})
		return
	}
	q := db.New(postgres.DbConn)

	channel, err := q.GetChannel(ctx, db.GetChannelParams{
		ID:      int64(channelId),
		OwnerID: personaId.(int64),
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
		PersonaID: personaId.(int64),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "left channel successfully"})
}
