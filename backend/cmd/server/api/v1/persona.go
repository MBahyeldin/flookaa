package v1

import (
	"app/internal/db/postgres/handlers/users"

	"github.com/gin-gonic/gin"
)

func AddPersonaRoutes(r *gin.RouterGroup) {
	personaGroup := r.Group("/persona")
	{
		personaGroup.GET("/show", users.ShowPersona)
	}
}
