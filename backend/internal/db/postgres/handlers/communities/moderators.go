package communities

import (
	"context"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

// AppointModerator: owner or global Administrator; the persona must be an active member.
func (h *Handler) AppointModerator(c *gin.Context) {
	personaID, communityID, community, ok := h.requireManager(c)
	if !ok {
		return
	}
	if !community.CanOwn() {
		c.JSON(http.StatusForbidden, gin.H{"error": "not_community_owner"})
		return
	}
	targetID, ok := personaIDParam(c)
	if !ok {
		return
	}
	if targetID == community.OwnerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_is_owner"})
		return
	}

	ctx := c.Request.Context()
	target, err := access.LoadCommunity(ctx, h.q, communityID, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !target.IsMember() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not_a_member"})
		return
	}
	n, err := h.q.AssignCommunityModerator(ctx, db.AssignCommunityModeratorParams{CommunityID: communityID, PersonaID: targetID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n > 0 {
		h.publishMembership(ctx, communityID, personaID, nats.EventModerator, db.EventActionEnumCreate, targetID, nats.ReasonAppointed)
	}
	c.JSON(http.StatusOK, gin.H{"is_moderator": true})
}

// RemoveModerator: owner or global Administrator, or the moderator stepping down.
// It ends the role, not the membership.
func (h *Handler) RemoveModerator(c *gin.Context) {
	personaID, communityID, community, ok := h.requireManager(c)
	if !ok {
		return
	}
	targetID, ok := personaIDParam(c)
	if !ok {
		return
	}
	self := targetID == personaID
	if !self && !community.CanOwn() {
		c.JSON(http.StatusForbidden, gin.H{"error": "not_community_owner"})
		return
	}

	ctx := c.Request.Context()
	n, err := h.q.RemoveCommunityModerator(ctx, db.RemoveCommunityModeratorParams{CommunityID: communityID, PersonaID: targetID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "moderator not found"})
		return
	}
	reason := nats.ReasonRemoved
	if self {
		reason = nats.ReasonSteppedDown
	}
	h.publishMembership(ctx, communityID, personaID, nats.EventModerator, db.EventActionEnumDelete, targetID, reason)
	c.JSON(http.StatusOK, gin.H{"is_moderator": false})
}

// endMembership runs a leave or a removal together with ending the persona's
// roles, and says whether a role was ended.
func (h *Handler) endMembership(ctx context.Context, communityID, personaID int64, end func(*db.Queries) (int64, error)) (ended, hadRole bool, err error) {
	tx, err := h.pg.BeginTx(ctx, nil)
	if err != nil {
		return false, false, err
	}
	defer tx.Rollback()
	q := h.q.WithTx(tx)
	n, err := end(q)
	if err != nil || n == 0 {
		return false, false, err
	}
	roles, err := q.RevokeCommunityRolesForPersona(ctx, db.RevokeCommunityRolesForPersonaParams{CommunityID: communityID, PersonaID: personaID})
	if err != nil {
		return false, false, err
	}
	return true, roles > 0, tx.Commit()
}
