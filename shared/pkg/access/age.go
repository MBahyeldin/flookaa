package access

import (
	"context"
	"shared/pkg/db"
)

// ValidMinAge: one of the allowed limits, and not above the setter's own age,
// so nobody locks themselves out.
func ValidMinAge(ctx context.Context, q *db.Queries, personaID int64, minAge int16) (bool, error) {
	switch minAge {
	case 13, 16, 18, 21:
	default:
		return false, nil
	}
	return q.PersonaMeetsMinAge(ctx, db.PersonaMeetsMinAgeParams{PersonaID: personaID, MinAge: minAge})
}
