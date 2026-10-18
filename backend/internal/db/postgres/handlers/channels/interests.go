package channels

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/interests"
	"context"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

const maxChannelInterests = 5

type InterestTag struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Emoji string `json:"emoji"`
}

// Every persona sees a channel's metadata, tags included.
func (h *Handler) ChannelInterests(c *gin.Context) {
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
	h.writeChannelInterests(c, channelId, channel.CanModerate)
}

func (h *Handler) SetChannelInterests(c *gin.Context) {
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
	if !channel.CanModerate {
		if !channel.CanRead() {
			c.JSON(http.StatusNotFound, gin.H{"error": access.ErrChannelNotFound.Error()})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "not_moderator"})
		return
	}
	var in struct {
		InterestIDs []int64 `json:"interest_ids"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_interests"})
		return
	}
	ctx := c.Request.Context()
	if code, err := h.checkInterests(ctx, channelId, in.InterestIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else if code != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": code})
		return
	}
	if err := h.q.ReplaceChannelInterests(ctx, db.ReplaceChannelInterestsParams{ChannelID: channelId, Ids: in.InterestIDs}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.publish(ctx, channelId, personaId, nats.EventChannelInterests, db.EventActionEnumUpdate, 0, "")
	h.writeChannelInterests(c, channelId, true)
}

// checkInterests returns an error code for the client, or "" when the ids may be saved.
// channelID 0 is a channel being created, so only active interests pass.
func (h *Handler) checkInterests(ctx context.Context, channelID int64, ids []int64) (string, error) {
	if !interests.ValidIDs(ids, maxChannelInterests) {
		return "invalid_interests", nil
	}
	allowed, err := h.q.CountAllowedChannelInterests(ctx, db.CountAllowedChannelInterestsParams{Ids: ids, ChannelID: channelID})
	if err != nil {
		return "", err
	}
	if int(allowed) != len(ids) {
		return "invalid_interest", nil
	}
	return "", nil
}

func (h *Handler) writeChannelInterests(c *gin.Context, channelId int64, canEdit bool) {
	tags, err := h.interestsByChannel(c.Request.Context(), []int64{channelId})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"interests": tags[channelId], "can_edit": canEdit})
}

// interestsByChannel always has an entry, possibly empty, for every id.
func (h *Handler) interestsByChannel(ctx context.Context, ids []int64) (map[int64][]InterestTag, error) {
	out := make(map[int64][]InterestTag, len(ids))
	for _, id := range ids {
		out[id] = []InterestTag{}
	}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := h.q.ListChannelInterests(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		out[r.ChannelID] = append(out[r.ChannelID], InterestTag{ID: r.ID, Name: r.Name, Slug: r.Slug, Emoji: r.Emoji})
	}
	return out, nil
}
