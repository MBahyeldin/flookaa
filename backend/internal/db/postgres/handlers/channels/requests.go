package channels

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

type JoinRequestResponse struct {
	PersonaID   int64  `json:"persona_id"`
	Name        string `json:"name"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Thumbnail   string `json:"thumbnail"`
	RequestedAt string `json:"requested_at"`
}

// ListJoinRequests lists pending join requests. Owner, moderators and admins only.
func (h *Handler) ListJoinRequests(c *gin.Context) {
	channelId, ok := h.requireModerator(c)
	if !ok {
		return
	}

	rows, err := h.q.ListPendingJoinRequests(c.Request.Context(), channelId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	requests := make([]JoinRequestResponse, 0, len(rows))
	for _, row := range rows {
		requests = append(requests, JoinRequestResponse{
			PersonaID:   row.PersonaID,
			Name:        row.Name,
			FirstName:   row.FirstName,
			LastName:    row.LastName,
			Thumbnail:   row.Thumbnail.String,
			RequestedAt: row.RequestedAt.Time.String(),
		})
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

func (h *Handler) ApproveJoinRequest(c *gin.Context) {
	h.resolveJoinRequest(c, db.ChannelMembershipStatusEnumActive)
}

func (h *Handler) RejectJoinRequest(c *gin.Context) {
	h.resolveJoinRequest(c, db.ChannelMembershipStatusEnumRejected)
}

func (h *Handler) resolveJoinRequest(c *gin.Context, status db.ChannelMembershipStatusEnum) {
	channelId, ok := h.requireModerator(c)
	if !ok {
		return
	}

	requesterId, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid persona ID"})
		return
	}

	_, err = h.q.ResolveJoinRequest(c.Request.Context(), db.ResolveJoinRequestParams{
		Status:    status,
		ChannelID: channelId,
		PersonaID: requesterId,
	})
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "no pending join request for this persona"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": string(status)})
}

// requireModerator resolves :channel_id and checks the persona may moderate
// it. Personas that cannot read a private channel get 404, others 403.
func (h *Handler) requireModerator(c *gin.Context) (int64, bool) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return 0, false
	}

	channelId, ok := channelIDParam(c)
	if !ok {
		return 0, false
	}

	channel, ok := h.loadChannel(c, channelId, personaId)
	if !ok {
		return 0, false
	}
	if !channel.CanModerate {
		if !channel.CanRead() {
			c.JSON(http.StatusNotFound, gin.H{"error": access.ErrChannelNotFound.Error()})
			return 0, false
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "only channel moderators can manage join requests"})
		return 0, false
	}
	return channelId, true
}
