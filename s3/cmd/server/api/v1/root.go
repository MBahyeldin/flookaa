package v1

import (
	"s3/cmd/server/api/v1/audio"

	"github.com/gin-gonic/gin"
)

func AddV1Group(r *gin.RouterGroup) *gin.RouterGroup {
	v1Group := r.Group("/v1")
	AddUploadRoutes(v1Group)
	AddHealthRoutes(v1Group)
	audio.AddAudioGroup(v1Group)
	return v1Group
}
