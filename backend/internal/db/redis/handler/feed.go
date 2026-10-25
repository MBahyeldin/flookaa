package handlers

import (
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"shared/pkg/types"

	"github.com/gin-gonic/gin"
)

// feed serves new posts, likes and comments of every channel in the persona's
// feed.
func (h *Handler) feed(c *gin.Context, wsMessage WsMessage, personaId int64) {
	subjects := []*types.SubjectOffsets{}
	channels, err := h.q.ListFeedChannels(c.Request.Context(), personaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	stream := nats.CONTENT_EVENTS_STREAM
	for _, channel := range channels {
		owner := &models.Owner{ID: channel.ID, Type: models.OwnerTypeChannel}
		for _, event := range []db.EventEnum{db.EventEnumPost, db.EventEnumLike, db.EventEnumComment} {
			subjects = append(subjects, subject.New(&stream, owner, string(event), "*").GetSubjectWithOffsets(0))
		}
	}

	c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": &subjects, "durable": false})
}
