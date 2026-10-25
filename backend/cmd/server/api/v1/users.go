package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/users"

	"github.com/gin-gonic/gin"
)

func AddUsersRoutes(r *gin.RouterGroup, users *users.Handler) {
	usersGroup := r.Group("/users", auth.RequireUser())
	{
		usersGroup.GET("/profile", users.GetProfile)
		usersGroup.PATCH("/profile", users.UpdateProfile)
		usersGroup.POST("/onboarding", users.MoveOnboarding)
		usersGroup.POST("/email/change", users.RequestEmailChange)
		usersGroup.POST("/email/change/cancel", users.CancelEmailChange)
		usersGroup.POST("/email/confirm", users.ConfirmEmailChange)
	}
}
