package files

import (
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"s3/internal/handlers/uploads"
	"s3/internal/imaging"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/singleflight"
)

// Storage keys are unique and their files never change.
const cacheControl = "public, max-age=31536000, immutable"

var variantsDir = filepath.Join(uploads.STORAGE_DIR, "variants")

var group singleflight.Group

// Serve answers /files/:storageKey, resized when ?w= (and optionally ?fmt=) is given.
func Serve(c *gin.Context) {
	key := c.Param("storageKey")
	if key == "" || strings.ContainsAny(key, `/\`) || strings.HasPrefix(key, ".") {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	original := filepath.Join(uploads.STORAGE_DIR, key)
	if info, err := os.Stat(original); err != nil || info.IsDir() {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	rawWidth, format := c.Query("w"), c.Query("fmt")
	if rawWidth == "" && format == "" {
		serve(c, original, "")
		return
	}
	width, err := strconv.Atoi(rawWidth)
	if err != nil || width < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "w must be a positive integer"})
		return
	}
	contentType, known := imaging.Formats[format]
	if format != "" && !known {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fmt must be webp, jpeg or png"})
		return
	}
	width = imaging.SnapWidth(width)

	name := key + "-" + strconv.Itoa(width)
	if format != "" {
		name += "." + format
	}
	path := filepath.Join(variantsDir, name)
	if _, err := os.Stat(path); err == nil {
		serve(c, path, contentType)
		return
	}

	_, err, _ = group.Do(name, func() (any, error) {
		if _, err := os.Stat(path); err == nil {
			return nil, nil
		}
		return nil, resizeTo(original, path, width, format)
	})
	switch {
	case errors.Is(err, imaging.ErrUseOriginal):
		serve(c, original, "")
	case err != nil:
		log.Printf("files %s: %v", name, err)
		serve(c, original, "")
	default:
		serve(c, path, contentType)
	}
}

func resizeTo(original, path string, width int, format string) error {
	data, err := os.ReadFile(original)
	if err != nil {
		return err
	}
	out, _, err := imaging.Resize(data, width, format)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(variantsDir, 0755); err != nil {
		return err
	}
	// Written aside and renamed, so a concurrent reader never sees half a file.
	tmp, err := os.CreateTemp(variantsDir, ".tmp-*")
	if err != nil {
		return err
	}
	if _, err := tmp.Write(out); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	if err := os.Chmod(tmp.Name(), 0644); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), path)
}

func serve(c *gin.Context, path, contentType string) {
	c.Header("Cache-Control", cacheControl)
	if contentType != "" {
		c.Header("Content-Type", contentType)
	}
	c.File(path)
}
