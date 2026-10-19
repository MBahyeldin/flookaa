package channels

import (
	"database/sql"
	"shared/external/db/nats"
	"shared/pkg/db"
)

type Handler struct {
	pg   *sql.DB
	q    *db.Queries
	nats *nats.NatsHelper
}

func NewHandler(pg *sql.DB, q *db.Queries, nats *nats.NatsHelper) *Handler {
	return &Handler{pg: pg, q: q, nats: nats}
}
