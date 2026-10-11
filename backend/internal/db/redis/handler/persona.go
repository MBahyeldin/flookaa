package handlers

import (
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"shared/pkg/types"

	"github.com/gin-gonic/gin"
)

// persona serves a profile's live counts. The subject is fixed here, whatever
// the client asks for, so this owner type never exposes a persona's
// notifications, messages or followers.
func (h *Handler) persona(c *gin.Context, wsMessage WsMessage, personaId int64) {
	ownerID := wsMessage.Payload.OwnerID
	if ownerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_id is required"})
		return
	}

	if wsMessage.Type == WsMessageTypeSubscribe {
		visible, err := access.VisiblePersonas(c.Request.Context(), h.q, personaId, []int64{ownerID})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if !visible[ownerID] {
			c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
			return
		}
	}

	stream := nats.USER_EVENTS_STREAM
	owner := &models.Owner{ID: ownerID, Type: models.OwnerTypePersona}
	subjects := []*types.SubjectOffsets{
		subject.New(&stream, owner, string(nats.EventFollowCounts), string(db.EventActionEnumUpdate)).GetSubjectWithOffsets(0),
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
