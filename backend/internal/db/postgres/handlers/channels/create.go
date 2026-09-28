package channels

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

type CreateChannelRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
	Banner      string `json:"banner"`
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

	q := h.q

	channel, err := q.CreateChannel(ctx, db.CreateChannelParams{
		Name:        req.Name,
		Description: req.Description,
		Thumbnail:   req.Thumbnail,
		Banner:      req.Banner,
		OwnerID:     personaId,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = q.AddUserToChannel(ctx, db.AddUserToChannelParams{
		ChannelID: channel.ID,
		PersonaID: personaId,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = q.FollowChannel(ctx, db.FollowChannelParams{
		ChannelID: channel.ID,
		PersonaID: personaId,
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
	_, err = q.AssignPersonaRoleInChannel(ctx, db.AssignPersonaRoleInChannelParams{
		ChannelID: channel.ID,
		PersonaID: personaId,
		RoleID:    moderatorRole.ID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// create channel stream in jetStream to send notifications for members and subs

	c.JSON(http.StatusOK, gin.H{"channel": channel})

}
