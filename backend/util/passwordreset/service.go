package passwordreset

import (
	"app/util/encryption"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"errors"
	"shared/pkg/db"
)

var ErrInvalidToken = errors.New("invalid_token")

type Service struct {
	pg *sql.DB
	q  *db.Queries
}

func NewService(pg *sql.DB, q *db.Queries) *Service {
	return &Service{pg: pg, q: q}
}

func hash(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

// Request issues a reset token for the account using email, or "" when there
// is none to send: no such user, no password (Google only), or inside the cooldown.
func (s *Service) Request(ctx context.Context, email string) (to, token string, err error) {
	user, err := s.q.GetUserForPasswordReset(ctx, email)
	if errors.Is(err, sql.ErrNoRows) {
		return "", "", nil
	}
	if err != nil {
		return "", "", err
	}
	if !user.HashedPassword.Valid || user.HashedPassword.String == "" {
		return "", "", nil
	}

	tx, err := s.pg.BeginTx(ctx, nil)
	if err != nil {
		return "", "", err
	}
	defer tx.Rollback()
	q := s.q.WithTx(tx)
	if _, err := q.LockUserForPasswordReset(ctx, user.ID); err != nil {
		return "", "", err
	}
	wait, err := q.GetPasswordResetWait(ctx, user.ID)
	if err != nil || wait > 0 {
		return "", "", err
	}
	if err := q.UseOpenPasswordResets(ctx, user.ID); err != nil {
		return "", "", err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	token = base64.RawURLEncoding.EncodeToString(raw)
	if err := q.InsertPasswordReset(ctx, db.InsertPasswordResetParams{UserID: user.ID, TokenHash: hash(token)}); err != nil {
		return "", "", err
	}
	if err := tx.Commit(); err != nil {
		return "", "", err
	}
	return user.EmailAddress, token, nil
}

func (s *Service) Check(ctx context.Context, token string) error {
	_, err := s.q.GetLivePasswordReset(ctx, hash(token))
	if errors.Is(err, sql.ErrNoRows) {
		return ErrInvalidToken
	}
	return err
}

// Reset sets the new password and uses up every open token of the user. The
// caller checks the password's strength.
func (s *Service) Reset(ctx context.Context, token, password string) error {
	hashed, err := encryption.HashPassword(password)
	if err != nil {
		return err
	}
	tx, err := s.pg.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	q := s.q.WithTx(tx)
	reset, err := q.LockLivePasswordReset(ctx, hash(token))
	if errors.Is(err, sql.ErrNoRows) {
		return ErrInvalidToken
	}
	if err != nil {
		return err
	}
	if err := q.SetUserPassword(ctx, db.SetUserPasswordParams{ID: reset.UserID, HashedPassword: sql.NullString{String: hashed, Valid: true}}); err != nil {
		return err
	}
	if err := q.UseOpenPasswordResets(ctx, reset.UserID); err != nil {
		return err
	}
	return tx.Commit()
}
