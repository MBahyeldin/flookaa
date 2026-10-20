package channels

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/communities"
	"context"
	"database/sql"
	"errors"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

type CreateChannelRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
	Banner      string `json:"banner"`
	// public: readable by every persona; private: members only, joins need approval.
	Visibility  string  `json:"visibility" binding:"required,oneof=public private"`
	InterestIDs []int64 `json:"interest_ids"`
	CommunityID int64   `json:"community_id"`
}

type CreateParams struct {
	Name        string
	Description string
	Thumbnail   string
	Banner      string
	Visibility  db.ChannelVisibilityEnum
	OwnerID     int64
	InterestIDs []int64
	// 0: standalone.
	CommunityID int64
	// A pending request to CommunityID instead of being in it.
	RequestCommunity bool
}

// Create stores a channel with its owner as active member, follower and
// moderator, its interests and its community, in one transaction.
func Create(ctx context.Context, pg *sql.DB, queries *db.Queries, p CreateParams) (db.Channel, error) {
	tx, err := pg.BeginTx(ctx, nil)
	if err != nil {
		return db.Channel{}, err
	}
	defer tx.Rollback()
	q := queries.WithTx(tx)

	channel, err := q.CreateChannel(ctx, db.CreateChannelParams{
		Name:        p.Name,
		Description: p.Description,
		Thumbnail:   p.Thumbnail,
		Banner:      p.Banner,
		OwnerID:     p.OwnerID,
		Visibility:  p.Visibility,
	})
	if err != nil {
		return db.Channel{}, err
	}
	if _, err := q.AddUserToChannel(ctx, db.AddUserToChannelParams{
		ChannelID: channel.ID,
		PersonaID: p.OwnerID,
		Status:    db.ChannelMembershipStatusEnumActive,
	}); err != nil {
		return db.Channel{}, err
	}
	if _, err := q.FollowChannel(ctx, db.FollowChannelParams{ChannelID: channel.ID, PersonaID: p.OwnerID}); err != nil {
		return db.Channel{}, err
	}
	moderatorRole, err := q.GetRoleByName(ctx, "moderator")
	if err != nil {
		return db.Channel{}, err
	}
	if _, err := q.AssignPersonaRoleInChannel(ctx, db.AssignPersonaRoleInChannelParams{
		ChannelID: channel.ID,
		PersonaID: p.OwnerID,
		RoleID:    moderatorRole.ID,
	}); err != nil {
		return db.Channel{}, err
	}
	if err := q.ReplaceChannelInterests(ctx, db.ReplaceChannelInterestsParams{ChannelID: channel.ID, Ids: p.InterestIDs}); err != nil {
		return db.Channel{}, err
	}
	if p.CommunityID != 0 && p.RequestCommunity {
		if _, err := q.RequestCommunityChannel(ctx, db.RequestCommunityChannelParams{
			CommunityID: p.CommunityID,
			ChannelID:   channel.ID,
			RequestedBy: sql.NullInt64{Int64: p.OwnerID, Valid: true},
		}); err != nil {
			return db.Channel{}, err
		}
	} else if p.CommunityID != 0 {
		if err := q.AddChannelToCommunity(ctx, db.AddChannelToCommunityParams{CommunityID: p.CommunityID, ChannelID: channel.ID}); err != nil {
			return db.Channel{}, err
		}
	}
	return channel, tx.Commit()
}

func (h *Handler) CreateChannel(c *gin.Context) {
	var req CreateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	if code, err := h.checkInterests(ctx, 0, req.InterestIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	} else if code != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": code})
		return
	}

	// A non-manager's channel is created standalone with a pending request.
	request := false
	if req.CommunityID != 0 {
		community, err := access.LoadCommunity(ctx, h.q, req.CommunityID, personaId)
		if errors.Is(err, access.ErrCommunityNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		request = !community.CanManage()
	}

	channel, err := Create(ctx, h.pg, h.q, CreateParams{
		Name:             req.Name,
		Description:      req.Description,
		Thumbnail:        req.Thumbnail,
		Banner:           req.Banner,
		Visibility:       db.ChannelVisibilityEnum(req.Visibility),
		OwnerID:          personaId,
		InterestIDs:      req.InterestIDs,
		CommunityID:      req.CommunityID,
		RequestCommunity: request,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	communityStatus := ""
	if req.CommunityID != 0 && request {
		communityStatus = string(db.CommunityChannelStatusEnumPending)
		communities.PublishChannelRequest(ctx, h.nats, req.CommunityID, personaId, db.EventActionEnumCreate, channel.ID, nats.ReasonRequested, nil)
	} else if req.CommunityID != 0 {
		communityStatus = string(db.CommunityChannelStatusEnumActive)
		communities.Publish(ctx, h.nats, req.CommunityID, personaId, nats.EventCommunityChannels)
	}

	c.JSON(http.StatusOK, gin.H{"channel": channel, "community_status": communityStatus})
}
