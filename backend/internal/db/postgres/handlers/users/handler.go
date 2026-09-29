package users

import (
	"app/util/email"
	"app/util/verification"
	"shared/pkg/db"
	"shared/util/token"
)

type Handler struct {
	q            *db.Queries
	signer       *token.Signer
	email        *email.Sender
	verification *verification.Service
}

func NewHandler(q *db.Queries, signer *token.Signer, email *email.Sender, verification *verification.Service) *Handler {
	return &Handler{q: q, signer: signer, email: email, verification: verification}
}
