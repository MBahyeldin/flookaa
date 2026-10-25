package emailchange

import (
	"app/util/verification"
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
	"fmt"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strings"
)

const ResendCooldownSeconds = 60

var (
	ErrSameEmail       = errors.New("same_email")
	ErrManagedByGoogle = errors.New("email_managed_by_google")
	ErrEmailTaken      = errors.New("email_taken")
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

// inTx commits unless fn fails; outcome is a user-facing result whose writes
// (a failed attempt) must still be committed.
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

func (s *Service) lockUser(ctx context.Context, q *db.Queries, userID int64) (db.LockUserForEmailChangeRow, error, error) {
	user, err := q.LockUserForEmailChange(ctx, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return user, ErrUserNotFound, nil
	}
	return user, nil, err
}

// Request replaces the user's open change with a code for newEmail, at most once per cooldown.
func (s *Service) Request(ctx context.Context, userID int64, newEmail string) (string, error) {
	var code string
	err := s.inTx(ctx, func(q *db.Queries) (error, error) {
		user, outcome, err := s.lockUser(ctx, q, userID)
		if outcome != nil || err != nil {
			return outcome, err
		}
		// Without a password the account logs in by its Google address.
		if !user.HashedPassword.Valid || user.HashedPassword.String == "" {
			return ErrManagedByGoogle, nil
		}
		if strings.EqualFold(user.EmailAddress, newEmail) {
			return ErrSameEmail, nil
		}
		taken, err := q.EmailTakenByOtherUser(ctx, db.EmailTakenByOtherUserParams{EmailAddress: newEmail, UserID: userID})
		if err != nil {
			return nil, err
		}
		if taken {
			return ErrEmailTaken, nil
		}
		wait, err := q.GetEmailChangeResendWait(ctx, userID)
		if err != nil {
			return nil, err
		}
		if wait > 0 {
			return &CooldownError{RetryAfter: wait}, nil
		}
		if err := q.ExpireOpenEmailChanges(ctx, userID); err != nil {
			return nil, err
		}
		code = verification.GenerateCode()
		if code == "" {
			return nil, fmt.Errorf("failed to generate email change code")
		}
		_, err = q.InsertEmailChange(ctx, db.InsertEmailChangeParams{UserID: userID, NewEmail: newEmail, Code: code})
		return nil, err
	})
	return code, err
}

// Confirm checks code against the user's live change and applies it, returning the old and new address.
func (s *Service) Confirm(ctx context.Context, userID int64, code string) (oldEmail, newEmail string, err error) {
	err = s.inTx(ctx, func(q *db.Queries) (error, error) {
		user, outcome, err := s.lockUser(ctx, q, userID)
		if outcome != nil || err != nil {
			return outcome, err
		}
		live, err := q.GetLiveEmailChange(ctx, userID)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCodeExpired, nil
		}
		if err != nil {
			return nil, err
		}
		if subtle.ConstantTimeCompare([]byte(live.Code), []byte(code)) != 1 {
			row, err := q.FailEmailChangeAttempt(ctx, live.ID)
			if err != nil {
				return nil, err
			}
			if row.IsExpired {
				return ErrCodeExpired, nil
			}
			return &InvalidCodeError{AttemptsLeft: row.MaxAttempts - row.FailedAttempts}, nil
		}
		taken, err := q.EmailTakenByOtherUser(ctx, db.EmailTakenByOtherUserParams{EmailAddress: live.NewEmail, UserID: userID})
		if err != nil {
			return nil, err
		}
		if taken {
			if err := q.ExpireOpenEmailChanges(ctx, userID); err != nil {
				return nil, err
			}
			return ErrEmailTaken, nil
		}
		if err := q.SetUserEmail(ctx, db.SetUserEmailParams{ID: userID, EmailAddress: live.NewEmail}); err != nil {
			return nil, err
		}
		if err := q.ConfirmEmailChange(ctx, live.ID); err != nil {
			return nil, err
		}
		if err := q.ExpireOpenEmailChanges(ctx, userID); err != nil {
			return nil, err
		}
		oldEmail, newEmail = user.EmailAddress, live.NewEmail
		return nil, nil
	})
	// Taken by a sign-up between the check and the update.
	if postgres.IsUniqueViolation(err, "users_email_address_key") {
		return "", "", ErrEmailTaken
	}
	return oldEmail, newEmail, err
}

func (s *Service) Cancel(ctx context.Context, userID int64) error {
	return s.q.ExpireOpenEmailChanges(ctx, userID)
}
