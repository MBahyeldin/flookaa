// Package counters recounts content counters from Postgres events, the
// single source of truth. Redis only caches these results (see
// shared/external/db/redis ContentStore).
package counters

import (
	"context"
	"fmt"
	"shared/pkg/db"
	"shared/pkg/graph/models"
)

// Count returns the current like and comment counts for a post or comment.
func Count(ctx context.Context, q *db.Queries, targetID string) (*models.Meta, error) {
	rows, err := q.GetMetaFromEvents(ctx, targetID)
	if err != nil {
		return nil, fmt.Errorf("count events for %s: %w", targetID, err)
	}

	var likes, comments int32
	for _, row := range rows {
		switch row.Name {
		case db.EventEnumLike:
			likes = int32(row.Count)
		case db.EventEnumComment:
			comments = int32(row.Count)
		}
	}
	return &models.Meta{
		LikesCount:    likes,
		CommentsCount: &comments,
	}, nil
}
