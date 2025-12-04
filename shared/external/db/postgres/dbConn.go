package postgres

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DbConn *sql.DB

func init() {
	db, err := sql.Open("postgres", os.Getenv("DATABASE_DSN"))
	if err != nil {
		log.Fatal("Failed to connect to the database:", err)
	}
	DbConn = db
}
