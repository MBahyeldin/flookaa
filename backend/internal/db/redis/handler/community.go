package handlers

import (
	"errors"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"shared/pkg/types"

	"github.com/gin-gonic/gin"
)

// Every persona sees community metadata, so any existing community may be subscribed to.
func (h *Handler) community(c *gin.Context, wsMessage WsMessage, personaId int64) {
	ownerID := wsMessage.Payload.OwnerID
	if ownerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_id is required"})
		return
	}

	// Unsubscribing also loads it, so a manager's request subjects are dropped too.
	community, err := access.LoadCommunity(c.Request.Context(), h.q, ownerID, personaId)
	if errors.Is(err, access.ErrCommunityNotFound) && wsMessage.Type == WsMessageTypeSubscribe {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if err != nil && !errors.Is(err, access.ErrCommunityNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	stream := nats.CHANNEL_EVENTS_STREAM
	owner := &models.Owner{ID: ownerID, Type: subject.OwnerTypeCommunity}
	subjects := []*types.SubjectOffsets{}
	for _, event := range []db.EventEnum{nats.EventCommunityInfo, nats.EventCommunityChannels, nats.EventCommunityCounts} {
		subjects = append(subjects, subject.New(&stream, owner, string(event), string(db.EventActionEnumUpdate)).GetSubjectWithOffsets(0))
	}
	subjects = append(subjects,
		subject.New(&stream, owner, string(nats.EventModerator), string(db.EventActionEnumCreate)).GetSubjectWithOffsets(0),
		subject.New(&stream, owner, string(nats.EventModerator), string(db.EventActionEnumDelete)).GetSubjectWithOffsets(0),
	)
	if community.CanManage() {
		for _, action := range []db.EventActionEnum{db.EventActionEnumCreate, db.EventActionEnumDelete} {
			subjects = append(subjects, subject.New(&stream, owner, string(nats.EventJoinRequest), string(action)).GetSubjectWithOffsets(0))
		}
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
