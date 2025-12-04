package db

import (
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func init() {
	Connect()
}

func Connect() {
	dsn := os.Getenv("DATABASE_DSN")

	if dsn == "" {
		panic("DATABASE_DSN environment variable not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect database: " + err.Error())
	}
	DB = db
}
