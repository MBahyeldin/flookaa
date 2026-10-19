package access

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"shared/pkg/db"
)

var ErrCommunityNotFound = errors.New("community not found")

// Every persona sees a community's metadata and its channel list; managing
// it (info, interests, creating channels in it) is CanManage.
type Community struct {
	db.GetCommunityAccessRow
}

func LoadCommunity(ctx context.Context, q *db.Queries, communityID, personaID int64) (Community, error) {
	row, err := q.GetCommunityAccess(ctx, db.GetCommunityAccessParams{
		CommunityID: communityID,
		PersonaID:   personaID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return Community{}, ErrCommunityNotFound
	}
	if err != nil {
		return Community{}, fmt.Errorf("load community access: %w", err)
	}
	return Community{row}, nil
}
