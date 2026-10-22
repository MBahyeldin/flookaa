package communities

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

// JoinCommunity joins a public community at once, or files a request on a private one.
func (h *Handler) JoinCommunity(c *gin.Context) {
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
	if community.IsMember() {
		c.JSON(http.StatusOK, gin.H{"status": "active"})
		return
	}
	if community.MembershipStatus.CommunityMembershipStatusEnum == db.CommunityMembershipStatusEnumPending {
		c.JSON(http.StatusAccepted, gin.H{"status": "pending"})
		return
	}
	if access.RejectedUntil(community.MembershipStatus, community.MembershipResolvedAt) != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "recently_rejected"})
		return
	}

	ctx := c.Request.Context()
	status := db.CommunityMembershipStatusEnumActive
	if community.IsPrivate() {
		status = db.CommunityMembershipStatusEnumPending
	}
	stored, err := h.q.JoinCommunity(ctx, db.JoinCommunityParams{CommunityID: communityID, PersonaID: personaID, Status: status})
	if errors.Is(err, sql.ErrNoRows) {
		// A concurrent join already stored a live row.
		c.JSON(http.StatusAccepted, gin.H{"status": "pending"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// A cancelled rejection inside its cooldown comes back as it was.
	if stored == db.CommunityMembershipStatusEnumRejected {
		c.JSON(http.StatusConflict, gin.H{"error": "recently_rejected"})
		return
	}

	if status == db.CommunityMembershipStatusEnumPending {
		h.publishMembership(ctx, communityID, personaID, nats.EventJoinRequest, db.EventActionEnumCreate, personaID, nats.ReasonRequested)
		c.JSON(http.StatusAccepted, gin.H{"status": "pending"})
		return
	}
	h.publishMembership(ctx, communityID, personaID, nats.EventMember, db.EventActionEnumCreate, personaID, nats.ReasonJoined)
	h.publishCounts(ctx, communityID, personaID)
	c.JSON(http.StatusOK, gin.H{"status": "active"})
}

// LeaveCommunity ends a membership or cancels a request.
func (h *Handler) LeaveCommunity(c *gin.Context) {
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
	if community.IsOwner {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_cannot_leave"})
		return
	}

	ctx := c.Request.Context()
	left, hadRole, err := h.endMembership(ctx, communityID, personaID, func(q *db.Queries) (int64, error) {
		return q.LeaveCommunity(ctx, db.LeaveCommunityParams{CommunityID: communityID, PersonaID: personaID})
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !left {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not_a_member"})
		return
	}
	if hadRole {
		h.publishMembership(ctx, communityID, personaID, nats.EventModerator, db.EventActionEnumDelete, personaID, nats.ReasonLeft)
	}

	// A cancelled rejection was in nobody's list, so it announces nothing.
	switch community.MembershipStatus.CommunityMembershipStatusEnum {
	case db.CommunityMembershipStatusEnumActive:
		h.publishMembership(ctx, communityID, personaID, nats.EventMember, db.EventActionEnumDelete, personaID, nats.ReasonLeft)
		h.publishCounts(ctx, communityID, personaID)
	case db.CommunityMembershipStatusEnumPending:
		h.publishMembership(ctx, communityID, personaID, nats.EventJoinRequest, db.EventActionEnumDelete, personaID, nats.ReasonCancelled)
	}
	c.JSON(http.StatusOK, gin.H{"status": "none"})
}

// FollowCommunity follows a public community; following grants nothing.
func (h *Handler) FollowCommunity(c *gin.Context) {
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
	if community.IsPrivate() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot_follow_private"})
		return
	}

	ctx := c.Request.Context()
	n, err := h.q.FollowCommunity(ctx, db.FollowCommunityParams{CommunityID: communityID, PersonaID: personaID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n > 0 {
		h.publishMembership(ctx, communityID, personaID, nats.EventFollower, db.EventActionEnumCreate, personaID, nats.ReasonFollowed)
		h.publishCounts(ctx, communityID, personaID)
	}
	c.JSON(http.StatusOK, gin.H{"following": true})
}

func (h *Handler) UnfollowCommunity(c *gin.Context) {
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

	ctx := c.Request.Context()
	n, err := h.q.UnfollowCommunity(ctx, db.UnfollowCommunityParams{CommunityID: communityID, PersonaID: personaID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n > 0 {
		h.publishMembership(ctx, communityID, personaID, nats.EventFollower, db.EventActionEnumDelete, personaID, nats.ReasonUnfollowed)
		h.publishCounts(ctx, communityID, personaID)
	}
	c.JSON(http.StatusOK, gin.H{"following": false})
}
