package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ChannelResponse struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	Thumbnail      string `json:"thumbnail"`
	Banner         string `json:"banner"`
	OwnerID        int64  `json:"owner_id"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
	IsOwner        bool   `json:"is_owner"`
	IsMember       bool   `json:"is_member"`
	IsPending      bool   `json:"is_pending"`
	Visibility     string `json:"visibility"`
	IsFollower     bool   `json:"is_follower"`
	MembersCount   int32  `json:"members_count"`
	FollowersCount int32  `json:"followers_count"`
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

	channels, err := q.GetAllChannels(ctx, db.GetAllChannelsParams{
		Limit:   limit,
		Offset:  offset,
		OwnerID: personaId,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var channelsList []ChannelResponse
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
		})
	}

	c.JSON(http.StatusOK, gin.H{"channels": channelsList})
}
