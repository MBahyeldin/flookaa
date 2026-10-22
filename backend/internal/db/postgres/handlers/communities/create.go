package communities

import (
	"app/internal/auth"
	"app/internal/logo"
	"app/internal/slug"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/access"
	"shared/pkg/db"
	"strings"

	"github.com/gin-gonic/gin"
)

type CreateCommunityRequest struct {
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description string  `json:"description"`
	Rules       string  `json:"rules"`
	Thumbnail   string  `json:"thumbnail"`
	Banner      string  `json:"banner"`
	Visibility  string  `json:"visibility"`
	InterestIDs []int64 `json:"interest_ids"`
	MinAge      *int16  `json:"min_age"`
	// Empty: tide and horizon.
	Theme        string `json:"theme"`
	CoverPattern string `json:"cover_pattern"`
}

const slugConstraint = "communities_slug_key"

// "create" is the page at /communities/create.
func validSlug(s string) bool {
	return slug.Valid(s) && s != "create"
}

func validName(name string) bool {
	return name != "" && len([]rune(name)) <= 100
}

func validRules(rules string) bool {
	return len([]rune(rules)) <= 5000
}

// lookError checks the fields a request sets; nil ones are left as they are.
func lookError(theme, coverPattern, thumbnail *string) string {
	switch {
	case theme != nil && !db.ThemeEnum(*theme).Valid():
		return "invalid_theme"
	case coverPattern != nil && !db.CoverPatternEnum(*coverPattern).Valid():
		return "invalid_cover_pattern"
	case thumbnail != nil && !logo.Valid(*thumbnail):
		return "invalid_logo"
	}
	return ""
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
	req.Rules = strings.TrimSpace(req.Rules)
	if req.Visibility == "" {
		req.Visibility = string(db.CommunityVisibilityEnumPublic)
	}
	if req.Theme == "" {
		req.Theme = string(db.ThemeEnumTide)
	}
	if req.CoverPattern == "" {
		req.CoverPattern = string(db.CoverPatternEnumHorizon)
	}
	if code := lookError(&req.Theme, &req.CoverPattern, &req.Thumbnail); code != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": code})
		return
	}
	switch {
	case !validName(req.Name):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_name"})
		return
	case !validSlug(req.Slug):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_slug"})
		return
	case !validRules(req.Rules):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_rules"})
		return
	case !db.CommunityVisibilityEnum(req.Visibility).Valid():
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_visibility"})
		return
	}

	ctx := c.Request.Context()
	if req.MinAge == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_min_age"})
		return
	}
	if ok, err := access.ValidMinAge(ctx, h.q, personaID, *req.MinAge); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_min_age"})
		return
	}
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
		Name:         req.Name,
		Slug:         req.Slug,
		Description:  req.Description,
		Rules:        req.Rules,
		Thumbnail:    req.Thumbnail,
		Banner:       req.Banner,
		Visibility:   db.CommunityVisibilityEnum(req.Visibility),
		OwnerID:      personaID,
		MinAge:       *req.MinAge,
		Theme:        db.ThemeEnum(req.Theme),
		CoverPattern: db.CoverPatternEnum(req.CoverPattern),
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
