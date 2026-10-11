package followers

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type FollowerFields struct {
	PersonaID int64  `json:"persona_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Thumbnail string `json:"thumbnail"`
	Anonymous bool   `json:"anonymous"`
}

type FollowRequestResponse struct {
	FollowerFields
	RequestedAt string `json:"requested_at"`
}

type FollowerResponse struct {
	FollowerFields
	FollowedAt string `json:"followed_at"`
}

// ListRequests lists the persona's own pending follow requests.
func (h *Handler) ListRequests(c *gin.Context) {
	personaID, ok := requireSelf(c)
	if !ok {
		return
	}
	rows, err := h.q.ListPendingFollowRequests(c.Request.Context(), personaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list follow requests"})
		return
	}

	requests := make([]FollowRequestResponse, len(rows))
	var ids []int64
	var fields []*FollowerFields
	for i, row := range rows {
		requests[i] = FollowRequestResponse{
			FollowerFields: FollowerFields{
				PersonaID: row.PersonaID,
				FirstName: row.FirstName,
				LastName:  row.LastName,
				Thumbnail: row.Thumbnail.String,
			},
			RequestedAt: row.RequestedAt.Time.Format(time.RFC3339),
		}
		if row.Privacy != db.PersonaPrivacyEnumPublic {
			ids = append(ids, row.PersonaID)
			fields = append(fields, &requests[i].FollowerFields)
		}
	}
	if !h.anonymize(c, personaID, ids, fields) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

// ListFollowers lists the persona's own active followers.
func (h *Handler) ListFollowers(c *gin.Context) {
	personaID, ok := requireSelf(c)
	if !ok {
		return
	}
	rows, err := h.q.ListFollowers(c.Request.Context(), personaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list followers"})
		return
	}

	followers := make([]FollowerResponse, len(rows))
	var ids []int64
	var fields []*FollowerFields
	for i, row := range rows {
		followers[i] = FollowerResponse{
			FollowerFields: FollowerFields{
				PersonaID: row.PersonaID,
				FirstName: row.FirstName,
				LastName:  row.LastName,
				Thumbnail: row.Thumbnail.String,
			},
			FollowedAt: row.FollowedAt.Time.Format(time.RFC3339),
		}
		if row.Privacy != db.PersonaPrivacyEnumPublic {
			ids = append(ids, row.PersonaID)
			fields = append(fields, &followers[i].FollowerFields)
		}
	}
	if !h.anonymize(c, personaID, ids, fields) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"followers": followers})
}

func (h *Handler) ApproveRequest(c *gin.Context) {
	h.resolveRequest(c, db.PersonaFollowStatusEnumActive)
}

// RejectRequest rejects for good: the requester can't ask again.
func (h *Handler) RejectRequest(c *gin.Context) {
	h.resolveRequest(c, db.PersonaFollowStatusEnumRejected)
}

func (h *Handler) resolveRequest(c *gin.Context, status db.PersonaFollowStatusEnum) {
	ctx := c.Request.Context()
	personaID, followerID, ok := followerParams(c)
	if !ok {
		return
	}

	_, err := h.q.ResolveFollowRequest(ctx, db.ResolveFollowRequestParams{
		Status:            status,
		PersonaID:         personaID,
		FollowerPersonaID: followerID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "no pending follow request"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve follow request"})
		return
	}

	if status == db.PersonaFollowStatusEnumActive {
		h.publishBy(ctx, personaID, personaID, followerID, nats.EventFollowRequest, db.EventActionEnumDelete, nats.ReasonApproved)
		h.publishBy(ctx, personaID, personaID, followerID, nats.EventFollower, db.EventActionEnumCreate, nats.ReasonApproved)
		h.publishCounts(ctx, personaID, followerID)
	} else {
		h.publishBy(ctx, personaID, personaID, followerID, nats.EventFollowRequest, db.EventActionEnumDelete, nats.ReasonRejected)
	}
	c.JSON(http.StatusOK, gin.H{"status": status})
}

// RemoveFollower ends someone's follow without telling them; they may follow again.
func (h *Handler) RemoveFollower(c *gin.Context) {
	ctx := c.Request.Context()
	personaID, followerID, ok := followerParams(c)
	if !ok {
		return
	}

	n, err := h.q.RemoveFollower(ctx, db.RemoveFollowerParams{
		PersonaID:         personaID,
		FollowerPersonaID: followerID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove follower"})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "not a follower"})
		return
	}

	h.publishBy(ctx, personaID, personaID, followerID, nats.EventFollower, db.EventActionEnumDelete, nats.ReasonRemoved)
	h.publishCounts(ctx, personaID, followerID)
	c.JSON(http.StatusOK, gin.H{"message": "follower removed"})
}

func (h *Handler) anonymize(c *gin.Context, viewerID int64, ids []int64, fields []*FollowerFields) bool {
	visible, err := access.VisiblePersonas(c.Request.Context(), h.q, viewerID, ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve personas"})
		return false
	}
	for i, id := range ids {
		if !visible[id] {
			*fields[i] = FollowerFields{PersonaID: id, FirstName: access.AnonymousName(id, 0), Anonymous: true}
		}
	}
	return true
}

// requireSelf only lets a persona manage its own followers.
func requireSelf(c *gin.Context) (int64, bool) {
	viewerID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return 0, false
	}
	personaID, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil || personaID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid persona ID"})
		return 0, false
	}
	if personaID != viewerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not_your_persona"})
		return 0, false
	}
	return personaID, true
}

func followerParams(c *gin.Context) (personaID, followerID int64, ok bool) {
	personaID, ok = requireSelf(c)
	if !ok {
		return 0, 0, false
	}
	followerID, err := strconv.ParseInt(c.Param("follower_id"), 10, 64)
	if err != nil || followerID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid follower ID"})
		return 0, 0, false
	}
	return personaID, followerID, true
}
