package api

import (
	v1 "s3/cmd/server/api/v1"

	"github.com/gin-gonic/gin"
)

func AddApiGroup(r *gin.Engine) *gin.RouterGroup {
	apiGroup := r.Group("/api")
	v1Group := v1.AddV1Group(apiGroup)
	return v1Group
}
