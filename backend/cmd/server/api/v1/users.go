package v1

import (
	"app/internal/db/postgres/handlers/users"

	"github.com/gin-gonic/gin"
)

func AddUsersRoutes(r *gin.RouterGroup) {
	usersGroup := r.Group("/users")
	{
		usersGroup.GET("/profile", users.GetProfile)
		usersGroup.PATCH("/profile", users.UpdateProfile)
	}
}
