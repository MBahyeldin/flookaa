package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

type SuggestedChannel struct {
	ChannelResponse
	Source string `json:"source"`
}

// Suggest lists channels for one of the user's own personas, as that persona sees them.
func (h *Handler) Suggest(c *gin.Context) {
	_, personaID, ok := auth.OwnPersona(c, h.q)
	if !ok {
		return
	}
	limit, offset := int64(20), int64(0)
	if l, err := strconv.ParseInt(c.Query("limit"), 10, 64); err == nil && l > 0 && l <= 50 {
		limit = l
	}
	if o, err := strconv.ParseInt(c.Query("offset"), 10, 64); err == nil && o >= 0 {
		offset = o
	}

	ctx := c.Request.Context()
	rows, err := h.q.SuggestChannels(ctx, db.SuggestChannelsParams{PersonaID: personaID, Lim: limit, Off: offset})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Members, pending requesters and followers are left out by the query.
	items := make([]channelItem, len(rows))
	for i, r := range rows {
		items[i] = channelItem{Channel: r.Channel, MembersCount: r.MembersCount, FollowersCount: r.FollowersCount}
	}
	built, err := h.build(ctx, personaID, items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]SuggestedChannel, len(built))
	for i, ch := range built {
		out[i] = SuggestedChannel{ChannelResponse: ch, Source: rows[i].Source}
	}
	c.JSON(http.StatusOK, gin.H{"channels": out})
}
