package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/channels"
	"app/internal/db/postgres/handlers/communities"
	"app/internal/db/postgres/handlers/followers"
	"app/internal/db/postgres/handlers/interests"
	"app/internal/db/postgres/handlers/users"

	"github.com/gin-gonic/gin"
)

func AddPersonaRoutes(r *gin.RouterGroup, users *users.Handler, followers *followers.Handler, interests *interests.Handler, communities *communities.Handler, channels *channels.Handler) {
	personaGroup := r.Group("/persona", auth.RequireUser())
	{
		personaGroup.GET("/list", users.ListPersonas)
		personaGroup.GET("/current", users.ReadCurrentPersona)
		personaGroup.POST("/create", users.CreatePersona)
		personaGroup.POST("/set-current-persona", users.SetCurrentPersona)
		personaGroup.POST("/update/:persona_id", users.UpdatePersona)
		personaGroup.GET("/invite/:token", auth.RequirePersona(), followers.ReadInvite)
		personaGroup.POST("/invite/:token/request", auth.RequirePersona(), followers.RequestViaInvite)
	}

	viewGroup := personaGroup.Group("/:persona_id", auth.RequirePersona())
	{
		viewGroup.GET("", users.ReadPersona)
		viewGroup.GET("/connected", users.ConnectedPersonas)
		viewGroup.GET("/channels", channels.ProfileChannels)
		viewGroup.POST("/follow", followers.Follow)
		viewGroup.POST("/unfollow", followers.Unfollow)
		viewGroup.POST("/invite", followers.Invite)
		viewGroup.POST("/uninvite", followers.Uninvite)

		// The persona's own followers and requests only.
		viewGroup.GET("/requests", followers.ListRequests)
		viewGroup.POST("/requests/:follower_id/approve", followers.ApproveRequest)
		viewGroup.POST("/requests/:follower_id/reject", followers.RejectRequest)
		viewGroup.GET("/followers", followers.ListFollowers)
		viewGroup.POST("/followers/:follower_id/remove", followers.RemoveFollower)
		viewGroup.POST("/invite-link", followers.InviteLink)
		viewGroup.POST("/invite-link/reset", followers.ResetInviteLink)
		viewGroup.POST("/invitations/:inviter_id/accept", followers.AcceptInvitation)
		viewGroup.POST("/invitations/:inviter_id/reject", followers.RejectInvitation)

		// Any of the user's own personas.
		viewGroup.GET("/interests", interests.PersonaInterests)
		viewGroup.PUT("/interests", interests.SetPersonaInterests)
		viewGroup.GET("/suggestions/communities", communities.Suggest)
		viewGroup.GET("/suggestions/channels", channels.Suggest)
	}
}
