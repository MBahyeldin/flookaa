package verification

import (
	"context"
	"database/sql"
	"fmt"
	"shared/pkg/db"
	"time"
)

type Service struct {
	q *db.Queries
}

func NewService(q *db.Queries) *Service {
	return &Service{q: q}
}

func (s *Service) CreateVerificationCode(userId int64) (string, error) {
	// create a new verification code for the user
	q := s.q
	ctx, cancle := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancle()

	newCode := generateRandomCode()
	if newCode == "" {
		return "", fmt.Errorf("failed to generate verification code")
	}

	userVerification, err := q.InsertUserVerification(ctx, db.InsertUserVerificationParams{
		UserID:           sql.NullInt64{Int64: userId, Valid: true},
		VerificationCode: newCode,
	})
	if err != nil {
		return "", err
	}

	return userVerification.VerificationCode, nil
}
