package verification

import (
	"context"
	"database/sql"
	"fmt"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"time"
)

func verifyUserCode(userId int64, inputCode string) error {
	ctx, cancle := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancle()

	q := db.New(postgres.DbConn)

	// verify the user's code
	userVerification, err := q.GetActiveUserVerificationByUserID(ctx, sql.NullInt64{Int64: userId, Valid: true})
	if err != nil {
		return err
	}
	if userVerification.VerificationCode != inputCode {
		return fmt.Errorf("invalid verification code")
	}

	return nil
}
