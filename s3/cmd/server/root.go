package server

import (
	"log"
	"path/filepath"
	"s3/cmd/server/api"
	audio_handler "s3/internal/handlers/audio"
	"s3/internal/handlers/uploads"
	"shared/util/envconfig"
	"shared/util/token"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func StartServer() {
	var env envconfig.Reader
	jwtSecret := env.Required("JWT_SECRET_KEY")
	if err := env.Err(); err != nil {
		log.Fatal(err)
	}
	signer, err := token.NewSigner(jwtSecret)
	if err != nil {
		log.Fatal("JWT_SECRET_KEY: ", err)
	}

	r := gin.Default()

	// TODO: REMOVE LOCALHOST BEFORE DEPLOYMENT
	r.Use(cors.New(cors.Config{
		AllowOrigins:  []string{"https://flookaa.com", "https://www.flookaa.com", "http://localhost:5173"},
		AllowMethods:  []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		ExposeHeaders: []string{"Content-Length"},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Authorization",
			"Priority",
			"Accept",
			"Accept-Language",
		},
		AllowCredentials: true,
	}))

	api.AddApiGroup(r, signer)

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
