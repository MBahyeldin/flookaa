package channels

import (
	"app/internal/auth"
	"context"
	"database/sql"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ChannelResponse struct {
	ID             int64         `json:"id"`
	Name           string        `json:"name"`
	Description    string        `json:"description"`
	Thumbnail      string        `json:"thumbnail"`
	Banner         string        `json:"banner"`
	OwnerID        int64         `json:"owner_id"`
	CreatedAt      string        `json:"created_at"`
	UpdatedAt      string        `json:"updated_at"`
	IsOwner        bool          `json:"is_owner"`
	IsMember       bool          `json:"is_member"`
	IsPending      bool          `json:"is_pending"`
	Visibility     string        `json:"visibility"`
	IsFollower     bool          `json:"is_follower"`
	MembersCount   int32         `json:"members_count"`
	FollowersCount int32         `json:"followers_count"`
	Interests      []InterestTag `json:"interests"`
	Community      *CommunityRef `json:"community"`
}

type CommunityRef struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (h *Handler) GetAllChannels(c *gin.Context) {
	ctx := c.Request.Context()

	// is_owner / is_member are per persona, not per user.
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	q := h.q

	limit := int64(10) // Default limit
	offset := int64(0) // Default offset

	if c.Query("limit") != "" {
		if l, err := strconv.Atoi(c.Query("limit")); err == nil {
			limit = int64(l)
		}
	}
	if c.Query("offset") != "" {
		if o, err := strconv.Atoi(c.Query("offset")); err == nil {
			offset = int64(o)
		}
	}

	var communityID sql.NullInt64
	if id, err := strconv.ParseInt(c.Query("community_id"), 10, 64); err == nil && id > 0 {
		communityID = sql.NullInt64{Int64: id, Valid: true}
	}

	channels, err := q.GetAllChannels(ctx, db.GetAllChannelsParams{
		Limit:        limit,
		Offset:       offset,
		OwnerID:      personaId,
		InterestSlug: sql.NullString{String: c.Query("interest"), Valid: c.Query("interest") != ""},
		CommunityID:  communityID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ids := make([]int64, len(channels))
	for i, ch := range channels {
		ids[i] = ch.ID
	}
	tags, err := h.interestsByChannel(ctx, ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	communities, err := h.communitiesByChannel(ctx, ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	channelsList := []ChannelResponse{}
	for _, ch := range channels {
		channelsList = append(channelsList, ChannelResponse{
			ID:             ch.ID,
			Name:           ch.Name,
			Description:    ch.Description,
			Thumbnail:      ch.Thumbnail,
			Banner:         ch.Banner,
			OwnerID:        ch.OwnerID,
			CreatedAt:      ch.CreatedAt.Time.String(),
			UpdatedAt:      ch.UpdatedAt.Time.String(),
			IsOwner:        ch.IsOwner,
			IsMember:       ch.IsMember,
			IsPending:      ch.IsPending,
			Visibility:     string(ch.Visibility),
			IsFollower:     ch.IsFollower,
			MembersCount:   ch.MembersCount,
			FollowersCount: ch.FollowersCount,
			Interests:      tags[ch.ID],
			Community:      communities[ch.ID],
		})
	}

	c.JSON(http.StatusOK, gin.H{"channels": channelsList})
}

func (h *Handler) communitiesByChannel(ctx context.Context, ids []int64) (map[int64]*CommunityRef, error) {
	out := make(map[int64]*CommunityRef, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := h.q.ListChannelCommunities(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		out[r.ChannelID] = &CommunityRef{ID: r.ID, Name: r.Name, Slug: r.Slug}
	}
	return out, nil
}
