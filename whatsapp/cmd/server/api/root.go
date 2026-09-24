package api

import (
	v1 "whatsapp/cmd/server/api/v1"
	"whatsapp/internal/config"
	"whatsapp/internal/whatsapp"

	"github.com/gin-gonic/gin"
)

func AddApiGroup(r *gin.Engine, cfg config.Config, svc *whatsapp.Service) *gin.RouterGroup {
	apiGroup := r.Group("/api")
	v1Group := v1.AddV1Group(apiGroup, cfg, svc)
	return v1Group
}
