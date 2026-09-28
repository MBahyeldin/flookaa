package api

import (
	v1 "s3/cmd/server/api/v1"
	"shared/util/token"

	"github.com/gin-gonic/gin"
)

func AddApiGroup(r *gin.Engine, signer *token.Signer) *gin.RouterGroup {
	apiGroup := r.Group("/api")
	v1Group := v1.AddV1Group(apiGroup, signer)
	return v1Group
}
