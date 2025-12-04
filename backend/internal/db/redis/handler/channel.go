package handlers

import (
	"fmt"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"shared/pkg/types"

	"github.com/gin-gonic/gin"
)

func channel(c *gin.Context, wsMessage WsMessage) {
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

	// TODO: validate id user can subscribe to this subject
	var streamName = nats.CONTENT_EVENTS_STREAM
	switch wsMessage.Type {
	case WsMessageTypeSubscribe:
		subjectHelper := subject.New(&streamName, &models.Owner{
			ID:   payload.OwnerID,
			Type: models.OwnerTypeChannel,
		}, payload.Event, payload.EventAction)
		subject := subjectHelper.GetSubjectWithOffsets(0)
		c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": &[]*types.SubjectOffsets{subject}, "durable": false})

	case WsMessageTypeUnsubscribe:
		subjectHelper := subject.New(&streamName, &models.Owner{
			ID:   payload.OwnerID,
			Type: models.OwnerTypeChannel,
		}, payload.Event, payload.EventAction)
		subject := subjectHelper.GetSubjectWithOffsets(0)
		c.JSON(http.StatusOK, gin.H{"action": "unsubscribe", "subjects": &[]*types.SubjectOffsets{subject}, "durable": false})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid action"})
	}
}
