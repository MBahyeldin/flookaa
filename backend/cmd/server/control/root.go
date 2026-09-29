package control

import (
	"app/internal/auth"
	handlers "app/internal/db/redis/handler"

	"github.com/gin-gonic/gin"
)

func AddControlGroup(r *gin.Engine, h *handlers.Handler) {
	r.POST("/control", auth.RequirePersona(), h.Control)
}
