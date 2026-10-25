package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/communities"

	"github.com/gin-gonic/gin"
)

func AddCommunitiesRoutes(r *gin.RouterGroup, communities *communities.Handler) {
	r.GET("/showcase", communities.Showcase)

	group := r.Group("/communities", auth.RequirePersona())
	{
		group.GET("/", communities.ListCommunities)
		group.POST("/create", communities.CreateCommunity)
		group.GET("/by-slug/:slug", communities.GetCommunityBySlug)
		group.GET("/:community_id", communities.GetCommunity)
		group.PATCH("/:community_id", communities.UpdateCommunity)

		group.POST("/:community_id/join", communities.JoinCommunity)
		group.POST("/:community_id/leave", communities.LeaveCommunity)
		group.POST("/:community_id/follow", communities.FollowCommunity)
		group.POST("/:community_id/unfollow", communities.UnfollowCommunity)

		group.GET("/:community_id/members", communities.ListMembers)
		group.POST("/:community_id/members/:persona_id/remove", communities.RemoveMember)

		group.POST("/:community_id/moderators/:persona_id", communities.AppointModerator)
		group.POST("/:community_id/moderators/:persona_id/remove", communities.RemoveModerator)

		group.GET("/:community_id/requests", communities.ListJoinRequests)
		group.POST("/:community_id/requests/:persona_id/approve", communities.ApproveJoinRequest)
		group.POST("/:community_id/requests/:persona_id/reject", communities.RejectJoinRequest)

		// Channels asking to join: the channel's moderators ask, cancel or leave; managers decide or remove.
		group.POST("/:community_id/channels/:channel_id/request", communities.RequestChannelJoin)
		group.POST("/:community_id/channels/:channel_id/cancel", communities.CancelChannelRequest)
		group.POST("/:community_id/channels/:channel_id/remove", communities.RemoveChannel)
		group.GET("/:community_id/channel-requests", communities.ListChannelRequests)
		group.POST("/:community_id/channel-requests/:channel_id/approve", communities.ApproveChannelRequest)
		group.POST("/:community_id/channel-requests/:channel_id/reject", communities.RejectChannelRequest)
	}
}
