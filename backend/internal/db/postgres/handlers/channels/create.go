package channels

import (
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

type CreateChannelRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
	Banner      string `json:"banner"`
}

func CreateChannel(c *gin.Context) {
	var req CreateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	q := db.New(postgres.DbConn)

	channel, err := q.CreateChannel(ctx, db.CreateChannelParams{
		Name:        req.Name,
		Description: req.Description,
		Thumbnail:   req.Thumbnail,
		Banner:      req.Banner,
		OwnerID:     userId.(int64),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = q.AddUserToChannel(ctx, db.AddUserToChannelParams{
		ChannelID: channel.ID,
		UserID:    userId.(int64),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = q.FollowChannel(ctx, db.FollowChannelParams{
		ChannelID: channel.ID,
		UserID:    userId.(int64),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	moderatorRole, err := q.GetRoleByName(ctx, "moderator")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// AssignUserRoleInChannel
	_, err = q.AssignUserRoleInChannel(ctx, db.AssignUserRoleInChannelParams{
		ChannelID: channel.ID,
		UserID:    userId.(int64),
		RoleID:    moderatorRole.ID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// create channel stream in jetStream to send notifications for members and subs

	c.JSON(http.StatusOK, gin.H{"channel": channel})

}
