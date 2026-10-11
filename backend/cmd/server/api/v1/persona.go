package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/followers"
	"app/internal/db/postgres/handlers/users"

	"github.com/gin-gonic/gin"
)

func AddPersonaRoutes(r *gin.RouterGroup, users *users.Handler, followers *followers.Handler) {
	personaGroup := r.Group("/persona", auth.RequireUser())
	{
		personaGroup.GET("/list", users.ListPersonas)
		personaGroup.GET("/current", users.ReadCurrentPersona)
		personaGroup.POST("/create", users.CreatePersona)
		personaGroup.POST("/set-current-persona", users.SetCurrentPersona)
		personaGroup.POST("/update/:persona_id", users.UpdatePersona)
	}

	viewGroup := personaGroup.Group("/:persona_id", auth.RequirePersona())
	{
		viewGroup.GET("", users.ReadPersona)
		viewGroup.GET("/connected", users.ConnectedPersonas)
		viewGroup.POST("/follow", followers.Follow)
		viewGroup.POST("/unfollow", followers.Unfollow)

		// The persona's own followers and requests only.
		viewGroup.GET("/requests", followers.ListRequests)
		viewGroup.POST("/requests/:follower_id/approve", followers.ApproveRequest)
		viewGroup.POST("/requests/:follower_id/reject", followers.RejectRequest)
		viewGroup.GET("/followers", followers.ListFollowers)
		viewGroup.POST("/followers/:follower_id/remove", followers.RemoveFollower)
	}
}
