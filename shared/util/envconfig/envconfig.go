// Package envconfig reads environment variables and collects every missing
// required one, so a binary can report them all in a single startup error.
package envconfig

import (
	"fmt"
	"os"
	"strings"
)

type Reader struct {
	missing []string
}

// Required returns the value of key and records it as missing when empty.
func (r *Reader) Required(key string) string {
	v := os.Getenv(key)
	if v == "" {
		r.missing = append(r.missing, key)
	}
	return v
}

// Optional returns the value of key, or fallback when it is empty.
func (r *Reader) Optional(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Err reports every required variable that was empty.
func (r *Reader) Err() error {
	if len(r.missing) == 0 {
		return nil
	}
	return fmt.Errorf("missing required environment variables: %s", strings.Join(r.missing, ", "))
}
