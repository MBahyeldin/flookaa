package communities

import (
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/db"
	"time"

	"github.com/gin-gonic/gin"
)

type JoinRequest struct {
	PersonaView
	RequestedAt string `json:"requested_at"`
}

func (h *Handler) ListJoinRequests(c *gin.Context) {
	_, communityID, _, ok := h.requireManager(c)
	if !ok {
		return
	}
	rows, err := h.q.ListCommunityJoinRequests(c.Request.Context(), communityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	requests := make([]JoinRequest, len(rows))
	views := make([]*PersonaView, len(rows))
	privacy := make([]db.PersonaPrivacyEnum, len(rows))
	for i, r := range rows {
		requests[i] = JoinRequest{
			PersonaView: PersonaView{PersonaID: r.PersonaID, FirstName: r.FirstName, LastName: r.LastName, Thumbnail: r.Thumbnail.String},
			RequestedAt: r.RequestedAt.Format(time.RFC3339),
		}
		views[i] = &requests[i].PersonaView
		privacy[i] = r.Privacy
	}
	if !h.anonymize(c, communityID, views, privacy) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

func (h *Handler) ApproveJoinRequest(c *gin.Context) {
	h.resolveJoinRequest(c, db.CommunityMembershipStatusEnumActive)
}

func (h *Handler) RejectJoinRequest(c *gin.Context) {
	h.resolveJoinRequest(c, db.CommunityMembershipStatusEnumRejected)
}

func (h *Handler) resolveJoinRequest(c *gin.Context, status db.CommunityMembershipStatusEnum) {
	personaID, communityID, _, ok := h.requireManager(c)
	if !ok {
		return
	}
	requesterID, ok := personaIDParam(c)
	if !ok {
		return
	}

	ctx := c.Request.Context()
	n, err := h.q.ResolveCommunityJoinRequest(ctx, db.ResolveCommunityJoinRequestParams{CommunityID: communityID, PersonaID: requesterID, Status: status})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "join request not found"})
		return
	}

	if status == db.CommunityMembershipStatusEnumActive {
		h.publishMembership(ctx, communityID, personaID, nats.EventJoinRequest, db.EventActionEnumDelete, requesterID, nats.ReasonApproved)
		h.publishMembership(ctx, communityID, personaID, nats.EventMember, db.EventActionEnumCreate, requesterID, nats.ReasonApproved)
		h.publishCounts(ctx, communityID, personaID)
		c.JSON(http.StatusOK, gin.H{"status": "active"})
		return
	}
	h.publishMembership(ctx, communityID, personaID, nats.EventJoinRequest, db.EventActionEnumDelete, requesterID, nats.ReasonRejected)
	c.JSON(http.StatusOK, gin.H{"status": "rejected"})
}
