package config

import (
	"log"
	"os"
	"strconv"
)

// Config holds everything the service reads from the environment.
//
// Unlike the shared/external/db packages, nothing here connects to anything on
// import: Load is called once from cmd/server so a missing variable produces a
// single readable failure instead of a panic from an init().
type Config struct {
	// APIToken is the shared secret every /api/v1 caller must present as
	// "Authorization: Bearer <token>". Required, no default.
	APIToken string

	// SessionDBPath is the SQLite file holding the whatsmeow device session.
	// It must live outside /opt/<service>/<version> or the gRPC deploy agent
	// will orphan it on the next release.
	SessionDBPath string

	// SendRate / SendBurst pace outgoing messages. WhatsApp bans unofficial
	// clients that send too fast, so this is a safety limit, not a nicety.
	SendRate  float64
	SendBurst int

	Port string
}

func Load() Config {
	cfg := Config{
		APIToken:      os.Getenv("WHATSAPP_API_TOKEN"),
		SessionDBPath: envOr("WHATSAPP_SESSION_DB", "/opt/whatsapp-data/session.db"),
		SendRate:      envFloatOr("WHATSAPP_SEND_RATE", 1),
		SendBurst:     envIntOr("WHATSAPP_SEND_BURST", 5),
		Port:          envOr("WHATSAPP_PORT", "8080"),
	}

	// Fail closed: an unset token must never degrade into an open relay that
	// can send WhatsApp messages from the linked account.
	if cfg.APIToken == "" {
		log.Fatal("WHATSAPP_API_TOKEN is not set, refusing to start")
	}
	if cfg.SendRate <= 0 {
		log.Fatal("WHATSAPP_SEND_RATE must be greater than 0")
	}
	if cfg.SendBurst <= 0 {
		log.Fatal("WHATSAPP_SEND_BURST must be greater than 0")
	}

	return cfg
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envIntOr(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(v)
	if err != nil {
		log.Fatalf("%s must be an integer, got %q", key, v)
	}
	return parsed
}

func envFloatOr(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(v, 64)
	if err != nil {
		log.Fatalf("%s must be a number, got %q", key, v)
	}
	return parsed
}
