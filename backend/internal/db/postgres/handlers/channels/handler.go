package channels

import (
	"database/sql"
	"shared/external/db/nats"
	"shared/pkg/db"
)

type Handler struct {
	pg        *sql.DB
	q         *db.Queries
	nats      *nats.NatsHelper
	s3BaseURL string
}

func NewHandler(pg *sql.DB, q *db.Queries, nats *nats.NatsHelper, s3BaseURL string) *Handler {
	return &Handler{pg: pg, q: q, nats: nats, s3BaseURL: s3BaseURL}
}
