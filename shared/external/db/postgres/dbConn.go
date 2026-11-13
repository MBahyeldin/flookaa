package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// Connect opens the Postgres pool and pings it, so a bad DSN or an unreachable
// server fails here instead of on the first query.
func Connect(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("postgres: open: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, fmt.Errorf("postgres: ping: %w", err)
	}
	warnIfNotUTC(pingCtx, db)
	return db, nil
}

// SQL such as persona_meets_min_age assumes the server runs in UTC.
func warnIfNotUTC(ctx context.Context, db *sql.DB) {
	var tz string
	if err := db.QueryRowContext(ctx, "SHOW TimeZone").Scan(&tz); err != nil {
		log.Printf("postgres: warning: can't read server TimeZone: %v", err)
		return
	}
	if tz != "UTC" && tz != "Etc/UTC" {
		log.Printf("postgres: warning: server TimeZone is %q, expected UTC", tz)
	}
}
