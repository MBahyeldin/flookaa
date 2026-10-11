package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/access"

	"github.com/gin-gonic/gin"
)

type PersonaFields struct {
	Name      string `json:"name"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Thumbnail string `json:"thumbnail"`
}

func (h *Handler) anonymize(c *gin.Context, channelID int64, ids []int64, fields []*PersonaFields) bool {
	viewerID, _ := auth.PersonaID(c)
	visible, err := access.VisiblePersonas(c.Request.Context(), h.q, viewerID, ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return false
	}
	for i, id := range ids {
		if !visible[id] {
			*fields[i] = PersonaFields{FirstName: access.AnonymousName(id, channelID)}
		}
	}
	return true
}
