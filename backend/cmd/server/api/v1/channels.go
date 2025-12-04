package v1

import (
	"app/internal/db/postgres/handlers/channels"

	"github.com/gin-gonic/gin"
)

func AddChannelsGroups(r *gin.RouterGroup) {
	channelsGroup := r.Group("/channels")
	{
		channelsGroup.GET("/", channels.GetAllChannels)
		channelsGroup.POST("/create", channels.CreateChannel)
		channelsGroup.POST("/join/:channel_id", channels.JoinChannel)
		channelsGroup.POST("/leave/:channel_id", channels.LeaveChannel)
	}
}
