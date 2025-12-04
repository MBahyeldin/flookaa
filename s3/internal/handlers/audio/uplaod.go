package uploads

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"s3/internal/models"
	"s3/pkg/db"
	"s3/util/encryption"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	ffmpeg_go "github.com/u2takey/ffmpeg-go"
)

var supportedAudioTypes = map[string]bool{
	"audio/webm;codecs=opus": true,
	"audio/ogg;codecs=opus":  true,
	"audio/mpeg":             true,
	"audio/wav":              true,
	"audio/flac":             true,
	"audio/mp4":              true,
}

const _MAX_AUDIO_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const AUDIO_STORAGE_DIR = "/opt/storage/audio/"

func Upload(c *gin.Context) {
	log.Println("Audio upload requested")
	log.Println("file-size", c.PostForm("file_size"))

	fileName := c.PostForm("file_name")
	fileSize, err := strconv.ParseInt(c.PostForm("file_size"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file size"})
		return
	}
	mimeType := c.PostForm("mime_type")

	uploadRequest := struct {
		FileName string `json:"file_name"`
		FileSize int64  `json:"file_size"`
		MimeType string `json:"mime_type"`
	}{
		FileName: fileName,
		FileSize: fileSize,
		MimeType: mimeType,
	}

	if uploadRequest.FileName == "" || uploadRequest.FileSize <= 0 || uploadRequest.MimeType == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request", "details": uploadRequest})
		return
	}

	if !supportedAudioTypes[uploadRequest.MimeType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported audio type", "mime_type": uploadRequest.MimeType})
		return
	}

	if uploadRequest.FileSize > _MAX_AUDIO_FILE_SIZE {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds limit", "max_size": _MAX_AUDIO_FILE_SIZE})
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

	inputFile, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file"})
		return
	}

	// write to a temp location
	inputFilePath := "/opt/tmp/" + upload.TicketID
	if err := c.SaveUploadedFile(inputFile, inputFilePath); err != nil {
		log.Println("Failed to save file:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	err = ffmpeg_go.Input(inputFilePath).
		Output(AUDIO_STORAGE_DIR+upload.TicketID+".mp3",
			ffmpeg_go.KwArgs{
				"ac":  1,     // mono channel (saves space)
				"b:a": "64k", // audio bitrate (64 kbps = great for voice)
				"ar":  44100, // sample rate
				"y":   "",    // overwrite output file if exists
			}).
		Run()

	if err != nil {
		log.Println("FFmpeg error:", fmt.Sprintf("%v", err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process audio"})
		return
	}

	// Clean up temp file
	_ = os.Remove(inputFilePath)

	// Update upload status
	upload.Status = "completed"
	upload.UpdatedAt = time.Now()
	if err := db.DB.Save(&upload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"file_path": "/audio/" + upload.TicketID + ".mp3",
	})
}
