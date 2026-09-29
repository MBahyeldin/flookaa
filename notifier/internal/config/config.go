// Package config is the only place the notifier reads its environment.
package config

import "shared/util/envconfig"

type Config struct {
	DatabaseDSN string
	NATSURL     string
}

func Load() (Config, error) {
	var r envconfig.Reader
	cfg := Config{
		// Notifications are stored in, and recounted from, Postgres.
		DatabaseDSN: r.Required("DATABASE_DSN"),
		NATSURL:     r.Required("NATS_CONNECTION"),
	}
	return cfg, r.Err()
}
