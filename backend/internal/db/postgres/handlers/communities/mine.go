package communities

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

type MyCommunity struct {
	ID           int64        `json:"id"`
	Name         string       `json:"name"`
	Slug         string       `json:"slug"`
	Thumbnail    string       `json:"thumbnail"`
	Theme        db.ThemeEnum `json:"theme"`
	MembersCount int32        `json:"members_count"`
	CanManage    bool         `json:"can_manage"`
}

func (h *Handler) MyCommunities(c *gin.Context) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	rows, err := h.q.ListPersonaCommunities(c.Request.Context(), personaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	communities := make([]MyCommunity, len(rows))
	for i, r := range rows {
		communities[i] = MyCommunity{r.ID, r.Name, r.Slug, r.Thumbnail, r.Theme, r.MembersCount, r.CanManage}
	}
	c.JSON(http.StatusOK, gin.H{"communities": communities})
}
