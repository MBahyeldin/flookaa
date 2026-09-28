package seeder

import (
	"app/internal/config"
	"context"
	"shared/external/db/postgres"
	"shared/pkg/db"
)

func SeedDb(cfg config.Seeder) error {
	pg, err := postgres.Connect(context.Background(), cfg.DatabaseDSN)
	if err != nil {
		return err
	}
	defer pg.Close()

	q := db.New(pg)
	SeedRoles(q)
	SeedUsers(q, cfg.AdminEmail, cfg.AdminPassword)
	return nil
}
