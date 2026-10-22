package communities

import (
	"app/internal/auth"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// PersonaView is another persona as the viewer sees it.
type PersonaView struct {
	PersonaID int64  `json:"persona_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Thumbnail string `json:"thumbnail"`
	Anonymous bool   `json:"anonymous"`
}

type Member struct {
	PersonaView
	IsOwner     bool   `json:"is_owner"`
	IsModerator bool   `json:"is_moderator"`
	JoinedAt    string `json:"joined_at"`
}

// ListMembers: everyone on a public community; members and managers on a private one.
func (h *Handler) ListMembers(c *gin.Context) {
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
	if !community.CanSeeInside() {
		c.JSON(http.StatusForbidden, gin.H{"error": "members_only"})
		return
	}
	limit, offset := int64(50), int64(0)
	if l, err := strconv.ParseInt(c.Query("limit"), 10, 64); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.ParseInt(c.Query("offset"), 10, 64); err == nil && o >= 0 {
		offset = o
	}

	rows, err := h.q.ListCommunityMembers(c.Request.Context(), db.ListCommunityMembersParams{CommunityID: communityID, Lim: limit, Off: offset})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	members := make([]Member, len(rows))
	views := make([]*PersonaView, len(rows))
	privacy := make([]db.PersonaPrivacyEnum, len(rows))
	for i, r := range rows {
		members[i] = Member{
			PersonaView: PersonaView{PersonaID: r.PersonaID, FirstName: r.FirstName, LastName: r.LastName, Thumbnail: r.Thumbnail.String},
			IsOwner:     r.IsOwner,
			IsModerator: r.IsModerator,
			JoinedAt:    r.JoinedAt.Format(time.RFC3339),
		}
		views[i] = &members[i].PersonaView
		privacy[i] = r.Privacy
	}
	if !h.anonymize(c, communityID, views, privacy) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"members": members})
}

// RemoveMember: managers only; the owner can't be removed, only CanOwn removes a
// moderator, and a removed persona may join again later.
func (h *Handler) RemoveMember(c *gin.Context) {
	personaID, communityID, community, ok := h.requireManager(c)
	if !ok {
		return
	}
	memberID, ok := personaIDParam(c)
	if !ok {
		return
	}
	if memberID == community.OwnerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_cannot_be_removed"})
		return
	}

	ctx := c.Request.Context()
	if !community.CanOwn() {
		member, err := access.LoadCommunity(ctx, h.q, communityID, memberID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if member.IsModerator {
			c.JSON(http.StatusForbidden, gin.H{"error": "not_community_owner"})
			return
		}
	}
	removed, hadRole, err := h.endMembership(ctx, communityID, memberID, func(q *db.Queries) (int64, error) {
		return q.RemoveCommunityMember(ctx, db.RemoveCommunityMemberParams{CommunityID: communityID, PersonaID: memberID})
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !removed {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}
	if hadRole {
		h.publishMembership(ctx, communityID, personaID, nats.EventModerator, db.EventActionEnumDelete, memberID, nats.ReasonRemoved)
	}
	h.publishMembership(ctx, communityID, personaID, nats.EventMember, db.EventActionEnumDelete, memberID, nats.ReasonRemoved)
	h.publishCounts(ctx, communityID, personaID)
	c.JSON(http.StatusOK, gin.H{"message": "member removed"})
}

// anonymize replaces the non-public personas the viewer doesn't see with
// their anonymous name in this community.
func (h *Handler) anonymize(c *gin.Context, communityID int64, views []*PersonaView, privacy []db.PersonaPrivacyEnum) bool {
	viewerID, _ := auth.PersonaID(c)
	var ids []int64
	for i, v := range views {
		if privacy[i] != db.PersonaPrivacyEnumPublic {
			ids = append(ids, v.PersonaID)
		}
	}
	visible, err := access.VisiblePersonas(c.Request.Context(), h.q, viewerID, ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return false
	}
	for i, v := range views {
		if privacy[i] != db.PersonaPrivacyEnumPublic && !visible[v.PersonaID] {
			*views[i] = PersonaView{PersonaID: v.PersonaID, FirstName: access.AnonymousCommunityName(v.PersonaID, communityID), Anonymous: true}
		}
	}
	return true
}

// requireManager writes the error itself when the persona can't manage the community.
func (h *Handler) requireManager(c *gin.Context) (int64, int64, access.Community, bool) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return 0, 0, access.Community{}, false
	}
	communityID, ok := communityIDParam(c)
	if !ok {
		return 0, 0, access.Community{}, false
	}
	community, ok := h.loadCommunity(c, communityID, personaID)
	if !ok {
		return 0, 0, access.Community{}, false
	}
	if !community.CanManage() {
		c.JSON(http.StatusForbidden, gin.H{"error": "not_community_manager"})
		return 0, 0, access.Community{}, false
	}
	return personaID, communityID, community, true
}

func personaIDParam(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid persona ID"})
		return 0, false
	}
	return id, true
}
