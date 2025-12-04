package v1

import (
	"github.com/gin-gonic/gin"
)

func AddHealthRoutes(r *gin.RouterGroup) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok-app",
		})
	})
}
