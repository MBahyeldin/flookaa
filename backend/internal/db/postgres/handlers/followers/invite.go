package followers

import (
	"app/internal/auth"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

// InviteLink returns the persona's follow-request link token, creating it once.
func (h *Handler) InviteLink(c *gin.Context) {
	h.inviteLink(c, false)
}

// ResetInviteLink replaces the token, so the old link stops working.
func (h *Handler) ResetInviteLink(c *gin.Context) {
	h.inviteLink(c, true)
}

func (h *Handler) inviteLink(c *gin.Context, reset bool) {
	ctx := c.Request.Context()
	personaID, ok := requireSelf(c)
	if !ok {
		return
	}

	token, err := newInviteToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invite link"})
		return
	}
	if reset {
		token, err = h.q.ResetPersonaInviteToken(ctx, db.ResetPersonaInviteTokenParams{Token: token, PersonaID: personaID})
	} else {
		token, err = h.q.EnsurePersonaInviteToken(ctx, db.EnsurePersonaInviteTokenParams{Token: token, PersonaID: personaID})
	}
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invite_link_requires_private"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invite link"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

// ReadInvite answers what the link's persona looks like to the viewer. The id
// is only returned to a viewer who already sees the persona.
func (h *Handler) ReadInvite(c *gin.Context) {
	ctx := c.Request.Context()
	viewerID, personaID, ok := h.inviteTarget(c)
	if !ok {
		return
	}

	rows, err := h.q.ResolvePersonasForViewer(ctx, db.ResolvePersonasForViewerParams{
		Ids:      []int64{personaID},
		ViewerID: viewerID,
	})
	if err != nil || len(rows) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read invite link"})
		return
	}
	if rows[0].Visible {
		c.JSON(http.StatusOK, gin.H{"visible": true, "persona_id": personaID})
		return
	}

	target, err := h.q.GetFollowTarget(ctx, db.GetFollowTargetParams{
		PersonaID:         personaID,
		FollowerPersonaID: viewerID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read invite link"})
		return
	}
	// Not visible means not active, so any row reads as pending.
	var status *db.PersonaFollowStatusEnum
	if target.FollowStatus.Valid {
		pending := db.PersonaFollowStatusEnumPending
		status = &pending
	}
	c.JSON(http.StatusOK, gin.H{"visible": false, "follow_status": status})
}

// RequestViaInvite files a follow request to the link's persona.
func (h *Handler) RequestViaInvite(c *gin.Context) {
	viewerID, personaID, ok := h.inviteTarget(c)
	if !ok {
		return
	}
	h.follow(c, viewerID, personaID)
}

func (h *Handler) inviteTarget(c *gin.Context) (viewerID, personaID int64, ok bool) {
	viewerID, ok = auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return 0, 0, false
	}
	personaID, err := h.q.GetPersonaByInviteToken(c.Request.Context(), c.Param("token"))
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "invite link not found"})
		return 0, 0, false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read invite link"})
		return 0, 0, false
	}
	return viewerID, personaID, true
}

func newInviteToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
