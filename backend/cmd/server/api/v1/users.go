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
	}
}
