package channels

import (
	"shared/external/db/nats"
	"shared/pkg/db"
)

type Handler struct {
	q    *db.Queries
	nats *nats.NatsHelper
}

func NewHandler(q *db.Queries, nats *nats.NatsHelper) *Handler {
	return &Handler{q: q, nats: nats}
}
