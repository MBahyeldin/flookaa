package server

import (
	"log"
	"path/filepath"
	"s3/cmd/server/api"
	audio_handler "s3/internal/handlers/audio"
	"s3/internal/handlers/uploads"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func StartServer() {
	r := gin.Default()

	// allow CORS for frontend running on localhost:5173
	// in production, change this to frontend domain
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	api.AddApiGroup(r)

	r.GET("/files/:storageKey", FilesHandler)
	r.GET("/audio/:storageKey", AudioHandler)

	log.Fatal(r.Run(":8080"))
}

// serve files from the "files" directory
// /files/storageKey
func FilesHandler(c *gin.Context) {
	storageKey := c.Param("storageKey")
	filePath := filepath.Join(uploads.STORAGE_DIR, storageKey)

	c.File(filePath)
}

// serve audio files from the "files" directory
// /audio/storageKey
func AudioHandler(c *gin.Context) {
	storageKey := c.Param("storageKey")
	filePath := filepath.Join(audio_handler.AUDIO_STORAGE_DIR, storageKey)

	c.File(filePath)
}
