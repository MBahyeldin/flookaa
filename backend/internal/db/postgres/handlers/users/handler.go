package users

import (
	"app/internal/onboarding"
	"app/util/email"
	"app/util/emailchange"
	"app/util/passwordreset"
	"app/util/verification"
	"context"
	"shared/external/db/redis"
	"shared/pkg/db"
	"shared/util/token"
)

type Handler struct {
	q            *db.Queries
	signer       *token.Signer
	email        *email.Sender
	verification *verification.Service
	emailChange  *emailchange.Service
	resets       *passwordreset.Service
	appBaseURL   string
	personas     *redis.PersonaStore
	invitations  Invitations
	onboarding   *onboarding.Flow
}

// Invitations withdraws a persona's follow invitations; followers.Handler implements it.
type Invitations interface {
	CancelInvitationsFrom(ctx context.Context, inviterID int64)
}

func NewHandler(q *db.Queries, signer *token.Signer, email *email.Sender, verification *verification.Service, emailChange *emailchange.Service, resets *passwordreset.Service, appBaseURL string, personas *redis.PersonaStore, invitations Invitations, onboarding *onboarding.Flow) *Handler {
	return &Handler{q: q, signer: signer, email: email, verification: verification, emailChange: emailChange, resets: resets, appBaseURL: appBaseURL, personas: personas, invitations: invitations, onboarding: onboarding}
}
