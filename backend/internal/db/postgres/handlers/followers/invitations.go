package followers

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Invite asks another persona to follow the acting one, which must be private.
// A pending request from that persona is approved instead.
func (h *Handler) Invite(c *gin.Context) {
	ctx := c.Request.Context()
	inviterID, inviteeID, ok := targetParams(c)
	if !ok {
		return
	}
	if inviterID == inviteeID {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}

	target, err := h.q.GetInviteTarget(ctx, db.GetInviteTargetParams{
		PersonaID:        inviterID,
		InviteePersonaID: inviteeID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invite persona"})
		return
	}
	if target.InviterPrivacy != db.PersonaPrivacyEnumPrivate {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot_invite"})
		return
	}
	if target.SameUser {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}
	visible, err := access.VisiblePersonas(ctx, h.q, inviterID, []int64{inviteeID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invite persona"})
		return
	}
	if !visible[inviteeID] {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}

	if target.FollowStatus.Valid {
		switch target.FollowStatus.PersonaFollowStatusEnum {
		case db.PersonaFollowStatusEnumActive:
			c.JSON(http.StatusOK, gin.H{"status": "following"})
			return
		case db.PersonaFollowStatusEnumPending:
			err := h.approve(ctx, inviterID, inviteeID)
			if err == nil {
				c.JSON(http.StatusOK, gin.H{"status": "following"})
				return
			}
			// A request withdrawn meanwhile falls through to a normal invitation.
			if !errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invite persona"})
				return
			}
		}
	}

	n, err := h.q.InvitePersona(ctx, db.InvitePersonaParams{
		PersonaID:        inviterID,
		InviteePersonaID: inviteeID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invite persona"})
		return
	}
	if n > 0 {
		h.publishBy(ctx, inviteeID, inviterID, inviterID, nats.EventFollowInvitation, db.EventActionEnumCreate, nats.ReasonInvited)
	}
	c.JSON(http.StatusAccepted, gin.H{"status": "invited"})
}

// Uninvite cancels the acting persona's pending invitation. A rejected one
// answers the same as none, so the inviter can't tell them apart.
func (h *Handler) Uninvite(c *gin.Context) {
	ctx := c.Request.Context()
	inviterID, inviteeID, ok := targetParams(c)
	if !ok {
		return
	}

	n, err := h.q.CancelInvitation(ctx, db.CancelInvitationParams{
		PersonaID:        inviterID,
		InviteePersonaID: inviteeID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel invitation"})
		return
	}
	if n == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not_invited"})
		return
	}

	h.publishBy(ctx, inviteeID, inviterID, inviterID, nats.EventFollowInvitation, db.EventActionEnumDelete, nats.ReasonCancelled)
	c.JSON(http.StatusOK, gin.H{"message": "invitation cancelled"})
}

func (h *Handler) AcceptInvitation(c *gin.Context) {
	ctx := c.Request.Context()
	inviteeID, inviterID, ok := inviterParams(c)
	if !ok {
		return
	}

	err := h.accept(ctx, inviterID, inviteeID)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "no pending invitation"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept invitation"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": db.PersonaFollowStatusEnumActive})
}

// RejectInvitation tells the inviter nothing; it can't invite again for 30 days.
func (h *Handler) RejectInvitation(c *gin.Context) {
	ctx := c.Request.Context()
	inviteeID, inviterID, ok := inviterParams(c)
	if !ok {
		return
	}

	n, err := h.q.RejectInvitation(ctx, db.RejectInvitationParams{
		PersonaID:        inviterID,
		InviteePersonaID: inviteeID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject invitation"})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "no pending invitation"})
		return
	}

	h.publishBy(ctx, inviteeID, inviteeID, inviterID, nats.EventFollowInvitation, db.EventActionEnumDelete, nats.ReasonRejected)
	c.JSON(http.StatusOK, gin.H{"status": db.PersonaInvitationStatusEnumRejected})
}

// CancelInvitationsFrom withdraws everything a persona has sent, e.g. when it
// stops being private.
func (h *Handler) CancelInvitationsFrom(ctx context.Context, inviterID int64) {
	invitees, err := h.q.CancelInvitationsFrom(ctx, inviterID)
	if err != nil {
		log.Printf("Warning: failed to cancel invitations from persona %d: %v", inviterID, err)
		return
	}
	for _, inviteeID := range invitees {
		h.publishBy(ctx, inviteeID, inviterID, inviterID, nats.EventFollowInvitation, db.EventActionEnumDelete, nats.ReasonCancelled)
	}
}

// accept makes the invitee an active follower of the inviter. sql.ErrNoRows
// means there was no pending invitation from a persona that is still private.
func (h *Handler) accept(ctx context.Context, inviterID, inviteeID int64) error {
	if _, err := h.q.AcceptInvitation(ctx, db.AcceptInvitationParams{
		PersonaID:        inviterID,
		InviteePersonaID: inviteeID,
	}); err != nil {
		return err
	}
	h.publishBy(ctx, inviteeID, inviteeID, inviterID, nats.EventFollowInvitation, db.EventActionEnumDelete, nats.ReasonAccepted)
	h.publish(ctx, inviterID, inviteeID, nats.EventFollower, db.EventActionEnumCreate, nats.ReasonInvited)
	h.publishCounts(ctx, inviterID, inviteeID)
	return nil
}

func inviterParams(c *gin.Context) (inviteeID, inviterID int64, ok bool) {
	inviteeID, ok = requireSelf(c)
	if !ok {
		return 0, 0, false
	}
	inviterID, err := strconv.ParseInt(c.Param("inviter_id"), 10, 64)
	if err != nil || inviterID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid inviter ID"})
		return 0, 0, false
	}
	return inviteeID, inviterID, true
}
