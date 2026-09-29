package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"shared/pkg/types"

	"github.com/gin-gonic/gin"
)

func (h *Handler) channel(c *gin.Context, wsMessage WsMessage, personaId int64) {
	fmt.Println("Channel control endpoint hit")

	payload := wsMessage.Payload
	if payload.Owner != OwnerTypeChannel {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid owner type for channel %s", payload.Owner)})
		return
	}

	if payload.Event == "" || payload.EventAction == "" || payload.OwnerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event, event_action, and owner_id are required"})
		return
	}

	// Subscribing needs read access; private channels answer 404 to non-members.
	// Unsubscribing is always allowed.
	if wsMessage.Type == WsMessageTypeSubscribe {
		channelAccess, err := access.LoadChannel(c.Request.Context(), h.q, payload.OwnerID, personaId)
		if err == nil {
			err = channelAccess.Read()
		}
		if errors.Is(err, access.ErrChannelNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// A channel's realtime feed is its content (posts, comments, likes) plus
	// its membership changes (members, followers, join requests), which live
	// in separate streams.
	owner := &models.Owner{ID: payload.OwnerID, Type: models.OwnerTypeChannel}
	subjects := []*types.SubjectOffsets{}
	for _, stream := range []string{nats.CONTENT_EVENTS_STREAM, nats.CHANNEL_EVENTS_STREAM} {
		subjects = append(subjects, subject.New(&stream, owner, payload.Event, payload.EventAction).GetSubjectWithOffsets(0))
	}

	switch wsMessage.Type {
	case WsMessageTypeSubscribe:
		c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": &subjects, "durable": false})

	case WsMessageTypeUnsubscribe:
		c.JSON(http.StatusOK, gin.H{"action": "unsubscribe", "subjects": &subjects, "durable": false})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid action"})
	}
}
