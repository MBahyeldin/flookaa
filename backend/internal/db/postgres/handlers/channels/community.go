package channels

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/pkg/db"
	"time"

	"github.com/gin-gonic/gin"
)

// ChannelCommunity: the channel's community, its pending request, or its rejection inside the cooldown.
func (h *Handler) ChannelCommunity(c *gin.Context) {
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
	if !channel.CanRead() {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	if !channel.CanModerate {
		c.JSON(http.StatusForbidden, gin.H{"error": "not_moderator"})
		return
	}

	state, err := h.q.GetChannelCommunityState(c.Request.Context(), channelId)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusOK, gin.H{"status": "none", "community": nil})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := gin.H{
		"status":    string(state.Status),
		"community": CommunityRef{ID: state.CommunityID, Name: state.Name, Slug: state.Slug},
	}
	if state.Status == db.CommunityChannelStatusEnumRejected && state.ResolvedAt.Valid {
		out["rejected_until"] = state.ResolvedAt.Time.Add(30 * 24 * time.Hour).UTC().Format(time.RFC3339)
	}
	c.JSON(http.StatusOK, out)
}

type ModeratedChannel struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Thumbnail  string `json:"thumbnail"`
	Visibility string `json:"visibility"`
	// none, pending or active.
	CommunityStatus string        `json:"community_status"`
	Community       *CommunityRef `json:"community"`
}

// ModeratedChannels lists the channels the persona owns or moderates, for suggesting one to a community.
func (h *Handler) ModeratedChannels(c *gin.Context) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	rows, err := h.q.ListModeratedChannels(c.Request.Context(), personaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]ModeratedChannel, len(rows))
	for i, r := range rows {
		out[i] = ModeratedChannel{ID: r.ID, Name: r.Name, Thumbnail: r.Thumbnail, Visibility: string(r.Visibility), CommunityStatus: "none"}
		if r.CommunityID != 0 {
			out[i].CommunityStatus = r.CommunityStatus
			out[i].Community = &CommunityRef{ID: r.CommunityID, Name: r.CommunityName, Slug: r.CommunitySlug}
		}
	}
	c.JSON(http.StatusOK, gin.H{"channels": out})
}
