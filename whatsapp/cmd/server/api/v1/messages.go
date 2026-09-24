package v1

import (
	"whatsapp/internal/config"
	"whatsapp/internal/handlers/messages"
	"whatsapp/internal/whatsapp"

	"github.com/gin-gonic/gin"
)

func AddMessageRoutes(r *gin.RouterGroup, cfg config.Config, svc *whatsapp.Service) {
	handler := messages.NewHandler(svc, cfg.SendRate, cfg.SendBurst)
	r.POST("/messages", handler.Send)
}
