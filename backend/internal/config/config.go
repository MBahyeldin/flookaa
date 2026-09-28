// Package config is the only place the backend reads its environment.
//
// Each command loads just what it uses, so the seeder does not need SMTP or
// OAuth settings to run.
package config

import "shared/util/envconfig"

type SMTP struct {
	Host     string
	Port     string
	Address  string
	Password string
}

type Google struct {
	ClientID     string
	ClientSecret string
}

// Server is everything `app` (no subcommand) needs.
type Server struct {
	DatabaseDSN   string
	MongoDSN      string
	NATSURL       string
	RedisAddr     string
	RedisPassword string
	JWTSecret     string
	S3BaseURL     string
	SMTP          SMTP
	Google        Google
}

func LoadServer() (Server, error) {
	var r envconfig.Reader
	cfg := Server{
		DatabaseDSN:   r.Required("DATABASE_DSN"),
		MongoDSN:      r.Required("MONGODB_DSN"),
		NATSURL:       r.Required("NATS_CONNECTION"),
		RedisAddr:     r.Required("REDIS_ADDR"),
		RedisPassword: r.Optional("REDIS_PASSWORD", ""),
		JWTSecret:     r.Required("JWT_SECRET_KEY"),
		S3BaseURL:     r.Required("S3_BASE_URL"),
		SMTP: SMTP{
			Host:     r.Required("SMTP_HOST"),
			Port:     r.Required("SMTP_PORT"),
			Address:  r.Required("SMTP_EMAIL_ADDRESS"),
			Password: r.Required("SMTP_EMAIL_PASSWORD"),
		},
		Google: Google{
			ClientID:     r.Required("GOOGLE_OAUTH_CLIENT_ID"),
			ClientSecret: r.Required("GOOGLE_OAUTH_CLIENT_SECRET"),
		},
	}
	return cfg, r.Err()
}

// Seeder is everything `app seed` needs.
type Seeder struct {
	DatabaseDSN   string
	AdminEmail    string
	AdminPassword string
}

func LoadSeeder() (Seeder, error) {
	var r envconfig.Reader
	cfg := Seeder{
		DatabaseDSN:   r.Required("DATABASE_DSN"),
		AdminEmail:    r.Required("ADMIN_EMAIL"),
		AdminPassword: r.Required("ADMIN_PASSWORD"),
	}
	return cfg, r.Err()
}
