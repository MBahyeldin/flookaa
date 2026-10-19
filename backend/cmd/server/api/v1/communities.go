package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/communities"

	"github.com/gin-gonic/gin"
)

func AddCommunitiesRoutes(r *gin.RouterGroup, communities *communities.Handler) {
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

		group.GET("/:community_id/requests", communities.ListJoinRequests)
		group.POST("/:community_id/requests/:persona_id/approve", communities.ApproveJoinRequest)
		group.POST("/:community_id/requests/:persona_id/reject", communities.RejectJoinRequest)
	}
}
