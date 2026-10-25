package communities

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListCommunities(c *gin.Context) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	limit, offset := int64(20), int64(0)
	if l, err := strconv.ParseInt(c.Query("limit"), 10, 64); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.ParseInt(c.Query("offset"), 10, 64); err == nil && o >= 0 {
		offset = o
	}

	ctx := c.Request.Context()
	listed, err := h.q.ListCommunities(ctx, db.ListCommunitiesParams{
		ViewerID:      personaID,
		InterestSlugs: c.QueryArray("interest"),
		Lim:           limit,
		Off:           offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	rows := make([]row, len(listed))
	for i, r := range listed {
		rows[i] = row{r.Community, r.ChannelsCount}
	}
	communities, err := h.build(ctx, personaID, rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"communities": communities})
}

func (h *Handler) GetCommunityBySlug(c *gin.Context) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	r, err := h.q.GetCommunityBySlug(c.Request.Context(), c.Param("slug"))
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "community not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.writeRow(c, row{r.Community, r.ChannelsCount}, personaID, http.StatusOK)
}

// By id, so a page can follow a slug change.
func (h *Handler) GetCommunity(c *gin.Context) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	communityID, ok := communityIDParam(c)
	if !ok {
		return
	}
	if _, ok := h.loadCommunity(c, communityID, personaID); !ok {
		return
	}
	h.writeOne(c, communityID, personaID, http.StatusOK)
}
