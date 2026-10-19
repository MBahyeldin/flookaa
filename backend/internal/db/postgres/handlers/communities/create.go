package communities

import (
	"app/internal/auth"
	"app/internal/slug"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strings"

	"github.com/gin-gonic/gin"
)

type CreateCommunityRequest struct {
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description string  `json:"description"`
	Thumbnail   string  `json:"thumbnail"`
	Banner      string  `json:"banner"`
	Visibility  string  `json:"visibility"`
	InterestIDs []int64 `json:"interest_ids"`
}

const slugConstraint = "communities_slug_key"

// "create" is the page at /communities/create.
func validSlug(s string) bool {
	return slug.Valid(s) && s != "create"
}

func validName(name string) bool {
	return name != "" && len([]rune(name)) <= 100
}

func (h *Handler) CreateCommunity(c *gin.Context) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	var req CreateCommunityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Visibility == "" {
		req.Visibility = string(db.CommunityVisibilityEnumPublic)
	}
	switch {
	case !validName(req.Name):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_name"})
		return
	case !validSlug(req.Slug):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_slug"})
		return
	case !db.CommunityVisibilityEnum(req.Visibility).Valid():
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_visibility"})
		return
	}

	ctx := c.Request.Context()
	if code, err := h.checkInterests(ctx, 0, req.InterestIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else if code != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": code})
		return
	}

	tx, err := h.pg.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()
	q := h.q.WithTx(tx)

	communityID, err := q.CreateCommunity(ctx, db.CreateCommunityParams{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		Thumbnail:   req.Thumbnail,
		Banner:      req.Banner,
		Visibility:  db.CommunityVisibilityEnum(req.Visibility),
		OwnerID:     personaID,
	})
	if postgres.IsUniqueViolation(err, slugConstraint) {
		c.JSON(http.StatusConflict, gin.H{"error": "slug_taken"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := q.ReplaceCommunityInterests(ctx, db.ReplaceCommunityInterestsParams{CommunityID: communityID, Ids: req.InterestIDs}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.writeOne(c, communityID, personaID, http.StatusCreated)
}
