package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/channels"

	"github.com/gin-gonic/gin"
)

func AddChannelsGroups(r *gin.RouterGroup, channels *channels.Handler) {
	channelsGroup := r.Group("/channels", auth.RequirePersona())
	{
		channelsGroup.GET("/", channels.GetAllChannels)
		channelsGroup.POST("/create", channels.CreateChannel)
		channelsGroup.POST("/join/:channel_id", channels.JoinChannel)
		channelsGroup.POST("/leave/:channel_id", channels.LeaveChannel)

		// Join requests for private channels: owner, moderators and admins.
		channelsGroup.GET("/:channel_id/requests", channels.ListJoinRequests)
		channelsGroup.POST("/:channel_id/requests/:persona_id/approve", channels.ApproveJoinRequest)
		channelsGroup.POST("/:channel_id/requests/:persona_id/reject", channels.RejectJoinRequest)
	}
}
