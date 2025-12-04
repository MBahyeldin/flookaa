package audio

import "github.com/gin-gonic/gin"

func AddAudioGroup(r *gin.RouterGroup) *gin.RouterGroup {
	audioGroup := r.Group("/audio")
	AddUploadRoutes(audioGroup)
	return audioGroup
}
