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
	}
}
