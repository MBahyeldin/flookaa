package seeder

import (
	"context"
	"database/sql"
	"log"
	"shared/external/db/postgres"
	"shared/pkg/db"
)

var roles = []db.CreateRoleParams{
	{Name: "Administrator", Description: sql.NullString{String: "Full system access", Valid: true}},
	{Name: "moderator", Description: sql.NullString{String: "Moderate content and users", Valid: true}},
	{Name: "member", Description: sql.NullString{String: "Regular user with standard access", Valid: true}},
	{Name: "viewer", Description: sql.NullString{String: "Limited access for viewer users", Valid: true}},
}

func SeedRoles() {
	ctx := context.Background()
	q := db.New(postgres.DbConn)

	for _, role := range roles {
		// Check if role already exists
		existingRole, err := q.GetRoleByName(ctx, role.Name)
		if err != nil && err != sql.ErrNoRows {
			log.Fatal(err)
		}
		if existingRole.ID != 0 {
			continue // Role already exists, skip creation
		}

		_, err = q.CreateRole(ctx, role)
		if err != nil {
			log.Fatal(err)
		}
	}
}
