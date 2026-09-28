// Package config is the only place the redis worker reads its environment.
package config

import "shared/util/envconfig"

type Config struct {
	DatabaseDSN   string
	NATSURL       string
	RedisAddr     string
	RedisPassword string
}

func Load() (Config, error) {
	var r envconfig.Reader
	cfg := Config{
		// Counters are recounted from Postgres events.
		DatabaseDSN:   r.Required("DATABASE_DSN"),
		NATSURL:       r.Required("NATS_CONNECTION"),
		RedisAddr:     r.Required("REDIS_ADDR"),
		RedisPassword: r.Optional("REDIS_PASSWORD", ""),
	}
	return cfg, r.Err()
}
