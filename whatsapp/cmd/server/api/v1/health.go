package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AddHealthRoutes(r *gin.RouterGroup) {
	r.GET("/health", HealthCheck)
}

// HealthCheck is liveness only: it says the process is up, not that WhatsApp is
// linked. Use /api/v1/status for that.
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok-whatsapp"})
}
