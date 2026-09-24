package v1

import (
	"whatsapp/internal/config"
	"whatsapp/internal/middlewares"
	"whatsapp/internal/whatsapp"

	"github.com/gin-gonic/gin"
)

func AddV1Group(r *gin.RouterGroup, cfg config.Config, svc *whatsapp.Service) *gin.RouterGroup {
	v1Group := r.Group("/v1")

	// Health stays unauthenticated so systemd/monitoring can probe it.
	AddHealthRoutes(v1Group)

	authed := v1Group.Group("", middlewares.AuthMiddleware(cfg.APIToken))
	AddMessageRoutes(authed, cfg, svc)
	AddStatusRoutes(authed, svc)

	return v1Group
}
