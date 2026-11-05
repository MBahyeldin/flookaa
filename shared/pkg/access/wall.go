package access

import (
	"context"
	"errors"
	"fmt"
	"shared/pkg/db"
)

// ErrWallNotFound is returned for missing personas and for personas the viewer
// only sees anonymously, so a hidden wall never shows it exists.
var ErrWallNotFound = errors.New("persona not found")

// ErrNotWallOwner is returned when a viewer posts on someone else's wall.
var ErrNotWallOwner = errors.New("only the persona posts on its wall")

// Wall is a persona's own posts, as one viewer may use them.
type Wall struct {
	PersonaID int64
	IsOwner   bool
}

// LoadWall answers ErrWallNotFound unless the viewer sees the real persona.
func LoadWall(ctx context.Context, q *db.Queries, personaID, viewerID int64) (Wall, error) {
	visible, err := VisiblePersonas(ctx, q, viewerID, []int64{personaID})
	if err != nil {
		return Wall{}, fmt.Errorf("load wall: %w", err)
	}
	if !visible[personaID] {
		return Wall{}, ErrWallNotFound
	}
	return Wall{PersonaID: personaID, IsOwner: personaID == viewerID}, nil
}

// Post returns nil only for the persona itself.
func (w Wall) Post() error {
	if !w.IsOwner {
		return ErrNotWallOwner
	}
	return nil
}

// CanModerate: the persona deletes anything on its wall.
func (w Wall) CanModerate() bool { return w.IsOwner }

// AnonymousWallName differs from the persona's channel, community and personal names.
func AnonymousWallName(personaID, wallID int64) string {
	return anonymousName(fmt.Sprintf("persona:%d:wall:%d", personaID, wallID))
}
