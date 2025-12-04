package audio

import (
	audio_handler "s3/internal/handlers/audio"

	"github.com/gin-gonic/gin"
)

func AddUploadRoutes(r *gin.RouterGroup) {
	r.POST("/upload", audio_handler.Upload)
}
