package control

import (
	handlers "app/internal/db/redis/handler"

	"github.com/gin-gonic/gin"
)

func AddControlGroup(r *gin.Engine, h *handlers.Handler) {
	r.POST("/control", h.Control)
}
