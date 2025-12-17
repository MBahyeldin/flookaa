package v1

import (
	"s3/internal/handlers/getImage"

	"github.com/gin-gonic/gin"
)

func AddGetImageFromUrlRoutes(r *gin.RouterGroup) {
	r.POST("/get-image-from-url", getImage.FromUrl)
}
