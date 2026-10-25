package communities

import (
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

type ShowcaseCommunity struct {
	Slug          string              `json:"slug"`
	Name          string              `json:"name"`
	Thumbnail     string              `json:"thumbnail"`
	Theme         db.ThemeEnum        `json:"theme"`
	CoverPattern  db.CoverPatternEnum `json:"cover_pattern"`
	MembersCount  int32               `json:"members_count"`
	ChannelsCount int32               `json:"channels_count"`
}

func (h *Handler) Showcase(c *gin.Context) {
	rows, err := h.q.ListShowcaseCommunities(c.Request.Context(), 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	communities := make([]ShowcaseCommunity, len(rows))
	for i, r := range rows {
		communities[i] = ShowcaseCommunity{r.Slug, r.Name, r.Thumbnail, r.Theme, r.CoverPattern, r.MembersCount, r.ChannelsCount}
	}
	c.JSON(http.StatusOK, gin.H{"communities": communities})
}
