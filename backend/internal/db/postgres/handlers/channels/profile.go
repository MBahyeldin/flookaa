package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ProfileChannels lists the channels a persona is in, for its profile's
// Channels tab; only a viewer who sees the real persona gets them.
func (h *Handler) ProfileChannels(c *gin.Context) {
	viewerID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	personaID, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil || personaID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid persona_id parameter"})
		return
	}
	limit, offset := int64(24), int64(0)
	if l, err := strconv.ParseInt(c.Query("limit"), 10, 64); err == nil && l > 0 && l <= 50 {
		limit = l
	}
	if o, err := strconv.ParseInt(c.Query("offset"), 10, 64); err == nil && o >= 0 {
		offset = o
	}

	ctx := c.Request.Context()
	visible, err := access.VisiblePersonas(ctx, h.q, viewerID, []int64{personaID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !visible[personaID] {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}

	rows, err := h.q.ListProfileChannels(ctx, db.ListProfileChannelsParams{
		ViewerID:  viewerID,
		PersonaID: personaID,
		RowLimit:  limit,
		RowOffset: offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	items := make([]channelItem, len(rows))
	for i, r := range rows {
		items[i] = channelItem{
			Channel:        r.Channel,
			EffectiveTheme: r.EffectiveTheme,
			IsOwner:        r.IsOwner,
			IsMember:       r.IsMember,
			IsPending:      r.IsPending,
			IsFollower:     r.IsFollower,
			MembersCount:   r.MembersCount,
			FollowersCount: r.FollowersCount,
		}
	}
	out, err := h.build(ctx, viewerID, items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"channels": out})
}
