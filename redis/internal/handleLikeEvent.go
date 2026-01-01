package internal

import (
	"context"
	"fmt"
	"shared/external/db/nats"
	"shared/external/db/redis"
	"shared/pkg/db"
)

func handleLikeEvent(ctx context.Context, event nats.Event) error {
	switch event.Action {
	case db.EventActionEnumCreate:
		err := redis.Store.Persona.AddToPersonaActivity(ctx, event.ActorID, event.TargetId, db.EventEnumLike)
		if err != nil {
			return fmt.Errorf("failed to add persona activity: %w", err)
		}
		err = redis.Store.Content.IncrementPostMeta(ctx, event.TargetId, db.EventEnumLike, int64(1))
		if err != nil {
			return fmt.Errorf("failed to increment post meta: %w", err)
		}
	case db.EventActionEnumDelete:
		err := redis.Store.Persona.RemoveFromPersonaActivity(ctx, event.ActorID, event.TargetId, db.EventEnumLike)
		if err != nil {
			return fmt.Errorf("failed to remove persona activity: %w", err)
		}
		err = redis.Store.Content.IncrementPostMeta(ctx, event.TargetId, db.EventEnumLike, int64(-1))
		if err != nil {
			return fmt.Errorf("failed to decrement post meta: %w", err)
		}
	default:
		return fmt.Errorf("unknown action type: %s", event.Action)
	}
	return nil
}
