package db

import (
	"log"
	"s3/internal/models"
)

func init() {
	// Auto migrate the models
	if err := DB.AutoMigrate(&models.Upload{}); err != nil {
		log.Fatalf("failed to auto migrate models: %v", err)
	}
}
