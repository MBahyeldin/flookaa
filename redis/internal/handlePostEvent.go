package internal

import (
	"context"
	"fmt"
	"shared/external/db/nats"
	"shared/external/db/redis"
	"shared/pkg/db"
)

func handlePostEvent(ctx context.Context, event nats.Event) error {
	switch event.Action {
	case db.EventActionEnumCreate:
		return redis.Store.Persona.AddToPersonaActivity(ctx, event.ActorID, event.TargetId, db.EventEnumPost)
	case db.EventActionEnumDelete:
		return redis.Store.Persona.RemoveFromPersonaActivity(ctx, event.ActorID, event.TargetId, db.EventEnumPost)
	default:
		return fmt.Errorf("unknown action type: %s", event.Action)
	}
}
