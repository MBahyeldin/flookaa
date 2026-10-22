package verification

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
	"fmt"
	"shared/pkg/db"
)

const ResendCooldownSeconds = 60

var (
	ErrAlreadyVerified = errors.New("already_verified")
	ErrCodeExpired     = errors.New("code_expired")
	ErrUserNotFound    = errors.New("user_not_found")
)

type InvalidCodeError struct{ AttemptsLeft int32 }

func (e *InvalidCodeError) Error() string { return "invalid_code" }

type CooldownError struct{ RetryAfter int32 }

func (e *CooldownError) Error() string { return "resend_cooldown" }

type Service struct {
	pg *sql.DB
	q  *db.Queries
}

func NewService(pg *sql.DB, q *db.Queries) *Service {
	return &Service{pg: pg, q: q}
}

// inTx commits unless fn fails; outcome is a user-facing result such as a
// wrong code, whose writes (the failed attempt) must still be committed.
func (s *Service) inTx(ctx context.Context, fn func(q *db.Queries) (outcome error, err error)) error {
	tx, err := s.pg.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	outcome, err := fn(s.q.WithTx(tx))
	if err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return outcome
}

func (s *Service) lockUnverified(ctx context.Context, q *db.Queries, userID int64) (error, error) {
	user, err := q.LockUserForVerification(ctx, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrUserNotFound, nil
	}
	if err != nil {
		return nil, err
	}
	if user.IsVerified.Bool {
		return ErrAlreadyVerified, nil
	}
	return nil, nil
}

// Create issues the first code at sign-up.
func (s *Service) Create(ctx context.Context, userID int64) (string, error) {
	return s.issue(ctx, s.q, userID)
}

// Resend replaces the user's open codes with a new one, at most once per cooldown.
func (s *Service) Resend(ctx context.Context, userID int64) (string, error) {
	var code string
	err := s.inTx(ctx, func(q *db.Queries) (error, error) {
		if outcome, err := s.lockUnverified(ctx, q, userID); outcome != nil || err != nil {
			return outcome, err
		}
		wait, err := q.GetVerificationResendWait(ctx, nullID(userID))
		if err != nil {
			return nil, err
		}
		if wait > 0 {
			return &CooldownError{RetryAfter: wait}, nil
		}
		if err := q.ExpireOpenUserVerifications(ctx, nullID(userID)); err != nil {
			return nil, err
		}
		code, err = s.issue(ctx, q, userID)
		return nil, err
	})
	return code, err
}

// Verify checks code against the user's live code and marks the user verified.
func (s *Service) Verify(ctx context.Context, userID int64, code string) error {
	return s.inTx(ctx, func(q *db.Queries) (error, error) {
		if outcome, err := s.lockUnverified(ctx, q, userID); outcome != nil || err != nil {
			return outcome, err
		}
		live, err := q.GetActiveUserVerificationByUserID(ctx, nullID(userID))
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCodeExpired, nil
		}
		if err != nil {
			return nil, err
		}
		if subtle.ConstantTimeCompare([]byte(live.VerificationCode), []byte(code)) != 1 {
			row, err := q.IncrementFailedAttemptsAndExpireIfMaxReached(ctx, live.ID)
			if err != nil {
				return nil, err
			}
			if row.IsExpired.Bool {
				return ErrCodeExpired, nil
			}
			return &InvalidCodeError{AttemptsLeft: row.MaxAttempts - row.FailedAttempts}, nil
		}
		if _, err := q.MarkVerificationAsVerified(ctx, live.ID); err != nil {
			return nil, err
		}
		_, err = q.VerifyUserEmail(ctx, userID)
		return nil, err
	})
}

func (s *Service) issue(ctx context.Context, q *db.Queries, userID int64) (string, error) {
	code := generateRandomCode()
	if code == "" {
		return "", fmt.Errorf("failed to generate verification code")
	}
	row, err := q.InsertUserVerification(ctx, db.InsertUserVerificationParams{
		UserID:           nullID(userID),
		VerificationCode: code,
	})
	if err != nil {
		return "", err
	}
	return row.VerificationCode, nil
}

func nullID(id int64) sql.NullInt64 {
	return sql.NullInt64{Int64: id, Valid: true}
}
