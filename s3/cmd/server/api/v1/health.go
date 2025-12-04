package v1

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AddHealthRoutes(r *gin.RouterGroup) {
	r.GET("/health", HealthCheck)
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok-s3"})
}
