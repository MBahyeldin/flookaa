package v1

import (
	"whatsapp/internal/handlers/status"
	"whatsapp/internal/whatsapp"

	"github.com/gin-gonic/gin"
)

func AddStatusRoutes(r *gin.RouterGroup, svc *whatsapp.Service) {
	handler := status.NewHandler(svc)
	r.GET("/status", handler.Status)
}
