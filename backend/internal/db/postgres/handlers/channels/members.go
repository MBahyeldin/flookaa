package channels

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/db"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type MemberResponse struct {
	PersonaID   int64  `json:"persona_id"`
	Name        string `json:"name"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Thumbnail   string `json:"thumbnail"`
	JoinedAt    string `json:"joined_at"`
	IsOwner     bool   `json:"is_owner"`
	IsModerator bool   `json:"is_moderator"`
}

// ListMembers lists active members. Owner, moderators and admins only.
func (h *Handler) ListMembers(c *gin.Context) {
	channelId, ok := h.requireModerator(c)
	if !ok {
		return
	}

	rows, err := h.q.ListChannelMembers(c.Request.Context(), channelId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	members := make([]MemberResponse, 0, len(rows))
	for _, row := range rows {
		members = append(members, MemberResponse{
			PersonaID:   row.PersonaID,
			Name:        row.Name,
			FirstName:   row.FirstName,
			LastName:    row.LastName,
			Thumbnail:   row.Thumbnail.String,
			JoinedAt:    row.JoinedAt.Time.Format(time.RFC3339),
			IsOwner:     row.IsOwner,
			IsModerator: row.IsModerator,
		})
	}
	c.JSON(http.StatusOK, gin.H{"members": members})
}

// RemoveMember ends another persona's membership and revokes its roles in the
// channel. Owner, moderators and admins only; the owner can't be removed, and
// moderators leave through LeaveChannel rather than removing themselves.
func (h *Handler) RemoveMember(c *gin.Context) {
	ctx := c.Request.Context()

	channelId, ok := h.requireModerator(c)
	if !ok {
		return
	}
	personaId, _ := auth.PersonaID(c)

	memberId, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid persona ID"})
		return
	}
	if memberId == personaId {
		c.JSON(http.StatusBadRequest, gin.H{"error": "leave the channel instead of removing yourself"})
		return
	}

	member, ok := h.loadChannel(c, channelId, memberId)
	if !ok {
		return
	}
	if member.IsOwner {
		c.JSON(http.StatusBadRequest, gin.H{"error": "the channel owner can't be removed"})
		return
	}
	if !member.IsMember {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona is not a member of the channel"})
		return
	}

	// Roles first: if the second call fails, a retry still finds the member.
	if err := h.q.RevokeChannelRolesForPersona(ctx, db.RevokeChannelRolesForPersonaParams{
		ChannelID: channelId,
		PersonaID: memberId,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, err = h.q.RemoveUserFromChannel(ctx, db.RemoveUserFromChannelParams{
		ChannelID: channelId,
		PersonaID: memberId,
	})
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona is not a member of the channel"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.publish(ctx, channelId, personaId, nats.EventMember, db.EventActionEnumDelete, memberId, nats.ReasonRemoved)
	c.JSON(http.StatusOK, gin.H{"message": "member removed"})
}
