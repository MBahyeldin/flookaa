package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/users"

	"github.com/gin-gonic/gin"
)

func AddPersonaRoutes(r *gin.RouterGroup, users *users.Handler) {
	personaGroup := r.Group("/persona", auth.RequireUser())
	{
		personaGroup.GET("/list", users.ListPersonas)
		personaGroup.GET("/current", users.ReadCurrentPersona)
		personaGroup.POST("/create", users.CreatePersona)
		personaGroup.POST("/set-current-persona", users.SetCurrentPersona)
		personaGroup.POST("/update/:persona_id", users.UpdatePersona)
	}
}
