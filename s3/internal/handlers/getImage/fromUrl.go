package getImage

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"s3/internal/handlers/uploads"
	"s3/util/encryption"
	"shared/util/token"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
)

type GetImageFromUrlRequest struct {
	Token string `json:"token" binding:"required"`
}

func FromUrl(c *gin.Context) {
	var req GetImageFromUrlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	token, err := token.Verify(req.Token)
	if err != nil {
		c.JSON(401, gin.H{"error": "invalid token"})
		return
	}
	claims := token.Claims.(jwt.MapClaims)
	imageUrl, ok := claims["Url"].(string)
	if !ok {
		c.JSON(400, gin.H{"error": "invalid token payload"})
		return
	}

	imageData, err := http.Get(imageUrl)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch image"})
		return
	}
	defer imageData.Body.Close()

	storageKey := encryption.GetUUID()
	finalPath := filepath.Join(uploads.STORAGE_DIR, storageKey)

	out, err := os.Create(finalPath)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create image file"})
		return
	}
	defer out.Close()

	_, err = io.Copy(out, imageData.Body)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to save image"})
		return
	}

	imageUrl = fmt.Sprintf("/files/%s", storageKey)

	c.JSON(200, gin.H{"url": imageUrl})
}
