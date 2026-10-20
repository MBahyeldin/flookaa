package communities

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Suggest lists communities for one of the user's own personas, as that persona sees them.
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
	suggested, err := h.q.SuggestCommunities(ctx, db.SuggestCommunitiesParams{PersonaID: personaID, Lim: limit, Off: offset})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	rows := make([]row, len(suggested))
	for i, r := range suggested {
		rows[i] = row{r.Community, r.ChannelsCount}
	}
	communities, err := h.build(ctx, personaID, rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"communities": communities})
}
