package channels

import (
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ChannelResponse struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
	Banner      string `json:"banner"`
	OwnerID     int64  `json:"owner_id"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	IsOwner     bool   `json:"is_owner"`
	IsMember    bool   `json:"is_member"`
	IsFollower  bool   `json:"is_follower"`
}

func GetAllChannels(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	q := db.New(postgres.DbConn)

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
		OwnerID: userId.(int64),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var channelsList []ChannelResponse
	for _, ch := range channels {
		channelsList = append(channelsList, ChannelResponse{
			ID:          ch.ID,
			Name:        ch.Name,
			Description: ch.Description,
			Thumbnail:   ch.Thumbnail,
			Banner:      ch.Banner,
			OwnerID:     ch.OwnerID,
			CreatedAt:   ch.CreatedAt.Time.String(),
			UpdatedAt:   ch.UpdatedAt.Time.String(),
			IsOwner:     ch.IsOwner,
			IsMember:    ch.IsMember,
			IsFollower:  ch.IsFollower,
		})
	}

	c.JSON(http.StatusOK, gin.H{"channels": channelsList})
}
