package v1

import (
	"s3/cmd/server/api/v1/audio"
	"shared/util/token"

	"github.com/gin-gonic/gin"
)

func AddV1Group(r *gin.RouterGroup, signer *token.Signer) *gin.RouterGroup {
	v1Group := r.Group("/v1")
	AddUploadRoutes(v1Group)
	AddHealthRoutes(v1Group)
	AddGetImageFromUrlRoutes(v1Group, signer)
	audio.AddAudioGroup(v1Group)
	return v1Group
}
