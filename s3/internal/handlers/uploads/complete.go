package uploads

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"s3/internal/models"
	"s3/pkg/db"
	"s3/util/encryption"
	"time"

	"github.com/gin-gonic/gin"
)

type CompleteRequest struct {
	Filename    string `json:"filename" binding:"required"`
	TotalChunks int32  `json:"totalChunks" binding:"required"`
}

// /upload/:id/complete
func Complete(c *gin.Context) {
	uploadId := c.Param("id")
	var req CompleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	filename := req.Filename
	totalChunks := req.TotalChunks

	if uploadId == "" || filename == "" || totalChunks <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing params"})
		return
	}

	uploadPath := filepath.Join(STORAGE_DIR, uploadId)
	storageKey := encryption.GetUUID()
	finalPath := filepath.Join(STORAGE_DIR, storageKey)

	out, err := os.Create(finalPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create final file"})
		return
	}
	defer out.Close()

	// Merge chunks in order
	for i := 0; i < int(totalChunks); i++ {
		chunkPath := filepath.Join(uploadPath, fmt.Sprintf("chunk-%d", i))
		chunk, err := os.Open(chunkPath)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("missing chunk %d", i)})
			return
		}

		if _, err := io.Copy(out, chunk); err != nil {
			chunk.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed merging chunk"})
			return
		}
		chunk.Close()
	}

	// get upload record from db
	upload := models.Upload{}
	if err := db.DB.First(&upload, "ticket_id = ?", uploadId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "upload not found"})
		return
	}

	// check file size
	if upload.StorageKey != nil {
		fileInfo, err := os.Stat(finalPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get file info"})
			return
		}
		if fileInfo.Size() != upload.Filesize {
			os.Remove(finalPath)
			upload.Status = "failed"
			db.DB.Save(&upload)
			c.JSON(http.StatusBadRequest, gin.H{"error": "file size mismatch"})
			return
		}
	}

	upload.Status = "completed"
	upload.StorageKey = &storageKey
	upload.UpdatedAt = time.Now()

	if err := db.DB.Save(&upload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update upload record"})
		return
	}

	// Cleanup temporary chunks
	defer os.RemoveAll(uploadPath)

	c.JSON(http.StatusOK, gin.H{
		"message":    "upload completed",
		"url":        fmt.Sprintf("/files/%s", storageKey),
		"filename":   filename,
		"filesize":   upload.Filesize,
		"mimeType":   upload.MimeType,
		"uploadedAt": upload.UpdatedAt,
	})

}
