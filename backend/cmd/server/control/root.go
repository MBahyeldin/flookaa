package control

import (
	handlers "app/internal/db/redis/handler"

	"github.com/gin-gonic/gin"
)

func AddControlGroup(r *gin.Engine) {
	r.POST("/control", handlers.Control)
}
