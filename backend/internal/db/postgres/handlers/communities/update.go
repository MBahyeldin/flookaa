package communities

import (
	"app/internal/auth"
	"database/sql"
	"net/http"
	"shared/external/db/nats"
	"shared/external/db/postgres"
	"shared/pkg/access"
	"shared/pkg/db"
	"strings"

	"github.com/gin-gonic/gin"
)

// Absent fields are left as they are.
type UpdateCommunityRequest struct {
	Name         *string  `json:"name"`
	Slug         *string  `json:"slug"`
	Description  *string  `json:"description"`
	Rules        *string  `json:"rules"`
	Thumbnail    *string  `json:"thumbnail"`
	Banner       *string  `json:"banner"`
	Visibility   *string  `json:"visibility"`
	InterestIDs  *[]int64 `json:"interest_ids"`
	MinAge       *int16   `json:"min_age"`
	Theme        *string  `json:"theme"`
	CoverPattern *string  `json:"cover_pattern"`
}

func optional(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

func optionalMinAge(v *int16) sql.NullInt16 {
	if v == nil {
		return sql.NullInt16{}
	}
	return sql.NullInt16{Int16: *v, Valid: true}
}

func optionalTheme(v *string) db.NullThemeEnum {
	if v == nil {
		return db.NullThemeEnum{}
	}
	return db.NullThemeEnum{ThemeEnum: db.ThemeEnum(*v), Valid: true}
}

func optionalCoverPattern(v *string) db.NullCoverPatternEnum {
	if v == nil {
		return db.NullCoverPatternEnum{}
	}
	return db.NullCoverPatternEnum{CoverPatternEnum: db.CoverPatternEnum(*v), Valid: true}
}

func (h *Handler) UpdateCommunity(c *gin.Context) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	communityID, ok := communityIDParam(c)
	if !ok {
		return
	}
	community, ok := h.loadCommunity(c, communityID, personaID)
	if !ok {
		return
	}
	if !community.CanManage() {
		c.JSON(http.StatusForbidden, gin.H{"error": "not_community_manager"})
		return
	}

	var req UpdateCommunityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		req.Name = &trimmed
	}
	if req.Rules != nil {
		trimmed := strings.TrimSpace(*req.Rules)
		req.Rules = &trimmed
	}
	switch {
	case req.Visibility != nil && *req.Visibility != string(community.Visibility) && !community.CanOwn():
		c.JSON(http.StatusForbidden, gin.H{"error": "not_community_owner"})
		return
	case req.Name != nil && !validName(*req.Name):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_name"})
		return
	case req.Slug != nil && !validSlug(*req.Slug):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_slug"})
		return
	case req.Rules != nil && !validRules(*req.Rules):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_rules"})
		return
	case req.Visibility != nil && !db.CommunityVisibilityEnum(*req.Visibility).Valid():
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_visibility"})
		return
	}
	if code := lookError(req.Theme, req.CoverPattern, req.Thumbnail); code != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": code})
		return
	}

	ctx := c.Request.Context()
	if req.MinAge != nil {
		if ok, err := access.ValidMinAge(ctx, h.q, personaID, *req.MinAge); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		} else if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_min_age"})
			return
		}
	}
	if req.InterestIDs != nil {
		if code, err := h.checkInterests(ctx, communityID, *req.InterestIDs); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		} else if code != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": code})
			return
		}
	}

	tx, err := h.pg.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()
	q := h.q.WithTx(tx)

	visibility := db.NullCommunityVisibilityEnum{}
	if req.Visibility != nil {
		visibility = db.NullCommunityVisibilityEnum{CommunityVisibilityEnum: db.CommunityVisibilityEnum(*req.Visibility), Valid: true}
	}
	_, err = q.UpdateCommunity(ctx, db.UpdateCommunityParams{
		ID:           communityID,
		Name:         optional(req.Name),
		Slug:         optional(req.Slug),
		Description:  optional(req.Description),
		Rules:        optional(req.Rules),
		Thumbnail:    optional(req.Thumbnail),
		Banner:       optional(req.Banner),
		Visibility:   visibility,
		MinAge:       optionalMinAge(req.MinAge),
		Theme:        optionalTheme(req.Theme),
		CoverPattern: optionalCoverPattern(req.CoverPattern),
	})
	if postgres.IsUniqueViolation(err, slugConstraint) {
		c.JSON(http.StatusConflict, gin.H{"error": "slug_taken"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if req.InterestIDs != nil {
		if err := q.ReplaceCommunityInterests(ctx, db.ReplaceCommunityInterestsParams{CommunityID: communityID, Ids: *req.InterestIDs}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	var inheriting []int64
	if req.Theme != nil {
		if inheriting, err = q.ListCommunityInheritingChannelIDs(ctx, communityID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	var unfollowed, admitted []int64
	if visibility.Valid && visibility.CommunityVisibilityEnum != community.Visibility {
		if visibility.CommunityVisibilityEnum == db.CommunityVisibilityEnumPrivate {
			unfollowed, err = q.EndCommunityFollows(ctx, communityID)
		} else {
			admitted, err = q.ApproveAllCommunityJoinRequests(ctx, communityID)
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	Publish(ctx, h.nats, communityID, personaID, nats.EventCommunityInfo)
	for _, id := range inheriting {
		publishChannelUpdate(ctx, h.nats, id, personaID, nats.EventChannelInfo)
	}
	for _, id := range unfollowed {
		h.publishMembership(ctx, communityID, personaID, nats.EventFollower, db.EventActionEnumDelete, id, nats.ReasonRemoved)
	}
	for _, id := range admitted {
		h.publishMembership(ctx, communityID, personaID, nats.EventJoinRequest, db.EventActionEnumDelete, id, nats.ReasonApproved)
		h.publishMembership(ctx, communityID, personaID, nats.EventMember, db.EventActionEnumCreate, id, nats.ReasonApproved)
	}
	if len(unfollowed) > 0 || len(admitted) > 0 {
		h.publishCounts(ctx, communityID, personaID)
	}
	h.writeOne(c, communityID, personaID, http.StatusOK)
}
