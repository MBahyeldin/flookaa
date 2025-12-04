package seeder

import "shared/external/db/postgres"

func SeedDb() {
	defer postgres.DbConn.Close()
	SeedRoles()
	SeedUsers()
}
