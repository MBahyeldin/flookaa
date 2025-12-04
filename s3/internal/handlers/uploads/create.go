package uploads

import (
	"net/http"
	"s3/internal/models"
	"s3/pkg/db"
	"s3/util/encryption"
	"time"

	"github.com/gin-gonic/gin"
)

// /upload
func Create(c *gin.Context) {
	var uploadRequest models.UploadRequest
	// Validate the incoming JSON
	if err := c.ShouldBindJSON(&uploadRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if uploadRequest.FileName == "" || uploadRequest.FileSize <= 0 || uploadRequest.MimeType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data", "details": uploadRequest})
		return
	}

	// Save to the database
	upload := models.Upload{
		TicketID:  encryption.GetUUID(),
		ClientIP:  c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Filename:  uploadRequest.FileName,
		Filesize:  uploadRequest.FileSize,
		MimeType:  uploadRequest.MimeType,
		Status:    "pending",
	}

	if err := db.DB.Create(&upload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"ticket_id": upload.TicketID,
	})
}
