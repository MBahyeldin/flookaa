package internal

import (
	"context"
	"fmt"
	"shared/external/db/nats"
	"shared/pkg/db"
)

func (w *Worker) handlePostEvent(ctx context.Context, event nats.Event) error {
	switch event.Action {
	case db.EventActionEnumCreate:
		return w.persona.AddToPersonaActivity(ctx, event.ActorID, event.TargetId, db.EventEnumPost)
	case db.EventActionEnumDelete:
		return w.persona.RemoveFromPersonaActivity(ctx, event.ActorID, event.TargetId, db.EventEnumPost)
	default:
		return fmt.Errorf("unknown action type: %s", event.Action)
	}
}
