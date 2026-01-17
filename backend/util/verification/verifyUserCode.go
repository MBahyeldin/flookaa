package verification

import (
	"context"
	"database/sql"
	"fmt"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"time"
)

func VerifyUserCode(userId int64, inputCode string) error {
	ctx, cancle := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancle()

	q := db.New(postgres.DbConn)

	// verify the user's code
	userVerification, err := q.GetActiveUserVerificationByUserID(ctx, sql.NullInt64{Int64: userId, Valid: true})
	if err != nil {
		return err
	}
	if userVerification.VerificationCode != inputCode {
		// increase the attempt count
		_, err := q.IncrementFailedAttemptsAndExpireIfMaxReached(ctx, sql.NullInt64{Int64: userId, Valid: true})
		if err != nil {
			return err
		}
		return fmt.Errorf("invalid verification code")
	}

	_, err = q.VerifyUserEmail(ctx, int64(userId))

	if err != nil {
		return err
	}

	return nil
}
