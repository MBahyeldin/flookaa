package v1

import (
	"s3/internal/handlers/uploads"

	"github.com/gin-gonic/gin"
)

func AddUploadRoutes(r *gin.RouterGroup) {
	r.POST("/upload", uploads.Create)
	r.POST("/upload/:id", uploads.UploadChunks)
	r.POST("/upload/:id/complete", uploads.Complete)
}
