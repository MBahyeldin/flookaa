package verification

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

func (s *Service) canResendVerificationCode(userId int64) (bool, error) {
	// check if user can generate a new verification code
	q := s.q
	ctx, cancle := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancle()

	canResendVerificationCode, err := q.CanResendVerificationCode(ctx, sql.NullInt64{Int64: userId, Valid: true})
	if err != nil {
		return false, err
	}
	if !canResendVerificationCode {
		return false, fmt.Errorf("cannot resend verification code yet")
	}
	return true, nil
}

func (s *Service) GetNewVerificationCode(userId int64) (string, error) {
	// get a new verification code for the user
	canResend, err := s.canResendVerificationCode(userId)
	if err != nil {
		return "", err
	}
	if !canResend {
		return "", fmt.Errorf("cannot resend verification code yet")
	}
	return "", nil
}
