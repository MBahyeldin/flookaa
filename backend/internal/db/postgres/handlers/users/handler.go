package users

import (
	"app/util/email"
	"app/util/verification"
	"shared/external/db/redis"
	"shared/pkg/db"
	"shared/util/token"
)

type Handler struct {
	q            *db.Queries
	signer       *token.Signer
	email        *email.Sender
	verification *verification.Service
	personas     *redis.PersonaStore
}

func NewHandler(q *db.Queries, signer *token.Signer, email *email.Sender, verification *verification.Service, personas *redis.PersonaStore) *Handler {
	return &Handler{q: q, signer: signer, email: email, verification: verification, personas: personas}
}
