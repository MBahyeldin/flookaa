package uploads

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

const STORAGE_DIR = "/opt/storage"

// /upload/:id
func UploadChunks(c *gin.Context) {
	uploadId := c.Param("id")
	chunkIndex := c.PostForm("chunkIndex")

	if uploadId == "" || chunkIndex == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing uploadId or chunkIndex"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file: " + err.Error()})
		return
	}

	// Create directory for this upload
	uploadPath := filepath.Join(STORAGE_DIR, uploadId)
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create upload dir"})
		return
	}

	// Save chunk
	chunkPath := filepath.Join(uploadPath, "chunk-"+chunkIndex)
	if err := c.SaveUploadedFile(file, chunkPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save chunk"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("chunk %s uploaded", chunkIndex)})
}
