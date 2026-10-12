package followers

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Follow follows a public persona, or files a pending request for a private
// one. Following again changes nothing and publishes nothing.
func (h *Handler) Follow(c *gin.Context) {
	followerID, personaID, ok := targetParams(c)
	if !ok {
		return
	}
	h.follow(c, followerID, personaID)
}

func (h *Handler) follow(c *gin.Context, followerID, personaID int64) {
	ctx := c.Request.Context()
	if followerID == personaID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot follow yourself"})
		return
	}

	target, err := h.q.GetFollowTarget(ctx, db.GetFollowTargetParams{
		PersonaID:         personaID,
		FollowerPersonaID: followerID,
	})
	if errors.Is(err, sql.ErrNoRows) || (err == nil && target.Privacy == db.PersonaPrivacyEnumOnlyMe) {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow persona"})
		return
	}

	// Following a persona that invited you accepts the invitation.
	if target.Invited && !(target.FollowStatus.Valid && target.FollowStatus.PersonaFollowStatusEnum == db.PersonaFollowStatusEnumActive) {
		err := h.accept(ctx, personaID, followerID)
		if err == nil {
			respond(c, true)
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow persona"})
			return
		}
	}

	// A rejected request answers pending so it can't be re-sent.
	if target.FollowStatus.Valid {
		respond(c, target.FollowStatus.PersonaFollowStatusEnum == db.PersonaFollowStatusEnumActive)
		return
	}

	status := db.PersonaFollowStatusEnumActive
	if target.Privacy == db.PersonaPrivacyEnumPrivate {
		status = db.PersonaFollowStatusEnumPending
	}
	n, err := h.q.FollowPersona(ctx, db.FollowPersonaParams{
		PersonaID:         personaID,
		FollowerPersonaID: followerID,
		Status:            status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow persona"})
		return
	}

	active := status == db.PersonaFollowStatusEnumActive
	if n > 0 {
		if active {
			h.publish(ctx, personaID, followerID, nats.EventFollower, db.EventActionEnumCreate, nats.ReasonFollowed)
			h.publishCounts(ctx, personaID, followerID)
		} else {
			h.publish(ctx, personaID, followerID, nats.EventFollowRequest, db.EventActionEnumCreate, nats.ReasonRequested)
		}
	}
	respond(c, active)
}

// Unfollow ends an active follow or cancels a pending request.
func (h *Handler) Unfollow(c *gin.Context) {
	ctx := c.Request.Context()
	followerID, personaID, ok := targetParams(c)
	if !ok {
		return
	}

	status, err := h.q.UnfollowPersona(ctx, db.UnfollowPersonaParams{
		PersonaID:         personaID,
		FollowerPersonaID: followerID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not following this persona"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unfollow persona"})
		return
	}

	if status == db.PersonaFollowStatusEnumActive {
		h.publish(ctx, personaID, followerID, nats.EventFollower, db.EventActionEnumDelete, nats.ReasonUnfollowed)
		h.publishCounts(ctx, personaID, followerID)
	} else {
		h.publish(ctx, personaID, followerID, nats.EventFollowRequest, db.EventActionEnumDelete, nats.ReasonCancelled)
	}
	c.JSON(http.StatusOK, gin.H{"message": "unfollowed persona successfully"})
}

func targetParams(c *gin.Context) (followerID, personaID int64, ok bool) {
	followerID, ok = auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return 0, 0, false
	}
	personaID, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil || personaID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid persona ID"})
		return 0, 0, false
	}
	return followerID, personaID, true
}

func respond(c *gin.Context, active bool) {
	if active {
		c.JSON(http.StatusOK, gin.H{"status": db.PersonaFollowStatusEnumActive})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{"status": db.PersonaFollowStatusEnumPending})
}
