package api

import (
	v1 "app/cmd/server/api/v1"

	"github.com/gin-gonic/gin"
)

func AddApiGroup(r *gin.Engine, h v1.Handlers) *gin.RouterGroup {
	apiGroup := r.Group("/api")
	v1Group := v1.AddV1Group(apiGroup, h)
	return v1Group
}
