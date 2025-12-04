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
		FirstName:      "John",
		LastName:       "Doe",
		EmailAddress:   os.Getenv("ADMIN_EMAIL"),
		Phone:          "+1234567890",
		HashedPassword: os.Getenv("ADMIN_PASSWORD"), // In a real scenario, ensure this is hashed
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

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.HashedPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal(err)
		}
		user.HashedPassword = string(hashedPassword)

		_, err = q.CreateUser(ctx, user)
		if err != nil {
			log.Fatal(err)
		}
	}
}
