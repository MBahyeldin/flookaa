// Package notifications serves a persona's notifications. The rows are
// written by the notifier service; this package only reads them, recounts
// aggregated kinds and marks them read.
package notifications

import (
	"shared/external/db/redis"
	"shared/pkg/db"
)

type Handler struct {
	q        *db.Queries
	personas *redis.PersonaStore
}

func NewHandler(q *db.Queries, personas *redis.PersonaStore) *Handler {
	return &Handler{q: q, personas: personas}
}
