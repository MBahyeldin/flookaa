package v1

import (
	"s3/internal/handlers/getImage"
	"shared/util/token"

	"github.com/gin-gonic/gin"
)

func AddGetImageFromUrlRoutes(r *gin.RouterGroup, signer *token.Signer) {
	r.POST("/get-image-from-url", getImage.FromUrl(signer))
}
