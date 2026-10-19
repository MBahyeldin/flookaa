package communities

import (
	"app/internal/auth"
	"database/sql"
	"net/http"
	"shared/external/db/nats"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strings"

	"github.com/gin-gonic/gin"
)

// Absent fields are left as they are.
type UpdateCommunityRequest struct {
	Name        *string  `json:"name"`
	Slug        *string  `json:"slug"`
	Description *string  `json:"description"`
	Thumbnail   *string  `json:"thumbnail"`
	Banner      *string  `json:"banner"`
	Visibility  *string  `json:"visibility"`
	InterestIDs *[]int64 `json:"interest_ids"`
}

func optional(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
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
	if !community.CanManage {
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
	switch {
	case req.Name != nil && !validName(*req.Name):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_name"})
		return
	case req.Slug != nil && !validSlug(*req.Slug):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_slug"})
		return
	case req.Visibility != nil && !db.CommunityVisibilityEnum(*req.Visibility).Valid():
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_visibility"})
		return
	}

	ctx := c.Request.Context()
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
		ID:          communityID,
		Name:        optional(req.Name),
		Slug:        optional(req.Slug),
		Description: optional(req.Description),
		Thumbnail:   optional(req.Thumbnail),
		Banner:      optional(req.Banner),
		Visibility:  visibility,
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
