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

// feed serves new posts, likes and comments of every channel in the persona's
// feed.
func (h *Handler) feed(c *gin.Context, wsMessage WsMessage, personaId int64) {
	channels, err := h.q.ListFeedChannels(c.Request.Context(), personaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ids := make([]int64, len(channels))
	for i, channel := range channels {
		ids[i] = channel.ID
	}
	c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": channelContentSubjects(ids), "durable": false})
}

// discover serves the same events for the channels of one Discover mode.
func (h *Handler) discover(c *gin.Context, wsMessage WsMessage, personaId int64) {
	channels, err := h.q.ListDiscoverChannels(c.Request.Context(), db.ListDiscoverChannelsParams{
		PersonaID:     personaId,
		AllChannels:   wsMessage.Payload.All,
		InterestSlugs: wsMessage.Payload.Interests,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ids := make([]int64, len(channels))
	for i, channel := range channels {
		ids[i] = channel.ID
	}
	c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": channelContentSubjects(ids), "durable": false})
}

// communityFeed serves the same events for a community's channels the persona may read.
func (h *Handler) communityFeed(c *gin.Context, wsMessage WsMessage, personaId int64) {
	communityID := wsMessage.Payload.OwnerID
	if communityID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_id is required"})
		return
	}
	community, err := access.LoadCommunity(c.Request.Context(), h.q, communityID, personaId)
	if errors.Is(err, access.ErrCommunityNotFound) || (err == nil && !community.CanSeeInside()) {
		c.JSON(http.StatusNotFound, gin.H{"error": access.ErrCommunityNotFound.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	channels, err := h.q.ListCommunityFeedChannels(c.Request.Context(), db.ListCommunityFeedChannelsParams{
		PersonaID:   personaId,
		CommunityID: communityID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ids := make([]int64, len(channels))
	for i, channel := range channels {
		ids[i] = channel.ID
	}
	c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": channelContentSubjects(ids), "durable": false})
}

// profile serves a persona's wall events to a viewer who sees the real persona.
func (h *Handler) profile(c *gin.Context, wsMessage WsMessage, personaId int64) {
	target := wsMessage.Payload.OwnerID
	subjects := []*types.SubjectOffsets{}
	_, err := access.LoadWall(c.Request.Context(), h.q, target, personaId)
	if err != nil && !errors.Is(err, access.ErrWallNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err == nil {
		stream := nats.CONTENT_EVENTS_STREAM
		owner := &models.Owner{ID: target, Type: models.OwnerTypePersona}
		for _, event := range []db.EventEnum{db.EventEnumPost, db.EventEnumLike, db.EventEnumComment} {
			subjects = append(subjects, subject.New(&stream, owner, string(event), "*").GetSubjectWithOffsets(0))
		}
	}
	c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": subjects, "durable": false})
}

func channelContentSubjects(channelIDs []int64) []*types.SubjectOffsets {
	subjects := []*types.SubjectOffsets{}
	stream := nats.CONTENT_EVENTS_STREAM
	for _, id := range channelIDs {
		owner := &models.Owner{ID: id, Type: models.OwnerTypeChannel}
		for _, event := range []db.EventEnum{db.EventEnumPost, db.EventEnumLike, db.EventEnumComment} {
			subjects = append(subjects, subject.New(&stream, owner, string(event), "*").GetSubjectWithOffsets(0))
		}
	}
	return subjects
}
