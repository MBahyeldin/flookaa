migrate-up:
	migrate -path external/db/postgres/migrations -database "$$DATABASE_DSN" up

migrate-down:
	migrate -path external/db/postgres/migrations -database "$$DATABASE_DSN" down 1

migrate-force:
	migrate -path external/db/postgres/migrations -database "$$DATABASE_DSN" force 1

generate-models:
	rm -rf pkg/db  &&  sqlc generate && gqlgen generate