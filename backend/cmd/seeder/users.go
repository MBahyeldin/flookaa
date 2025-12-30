package seeder

import (
	"context"
	"database/sql"
	"log"
	"os"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"golang.org/x/crypto/bcrypt"
)

var users = []db.CreateUserParams{
	{
		FirstName:      "Mohamed",
		LastName:       "Bahyeldin",
		EmailAddress:   os.Getenv("ADMIN_EMAIL"),
		HashedPassword: sql.NullString{String: os.Getenv("ADMIN_PASSWORD"), Valid: true},
		Thumbnail:      sql.NullString{String: "/files/thumbnail.jpg", Valid: true},
	},
}

func SeedUsers() {
	ctx := context.Background()
	q := db.New(postgres.DbConn)

	for _, user := range users {
		// Check if user already exists
		existingUser, err := q.GetUserHashedPasswordByEmail(ctx, user.EmailAddress)
		if err != nil && err != sql.ErrNoRows {
			log.Fatal(err)
		}
		if existingUser.ID != 0 {
			continue // User already exists, skip creation
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.HashedPassword.String), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal(err)
		}
		user.HashedPassword = sql.NullString{String: string(hashedPassword), Valid: true}
		_, err = q.CreateUser(ctx, user)
		if err != nil {
			log.Fatal(err)
		}
	}
}
