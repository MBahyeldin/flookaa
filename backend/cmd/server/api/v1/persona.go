package v1

import (
	"app/internal/db/postgres/handlers/users"

	"github.com/gin-gonic/gin"
)

func AddPersonaRoutes(r *gin.RouterGroup) {
	personaGroup := r.Group("/persona")
	{
		personaGroup.GET("/list", users.ListPersonas)
		personaGroup.GET("/current", users.ReadCurrentPersona)
		personaGroup.POST("/create", users.CreatePersona)
	}
}
