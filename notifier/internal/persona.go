package internal

import (
	"context"
	"encoding/json"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/pkg/db"
	"strconv"
	"time"
)

// persona handles follow events on STREAM_USER_EVENTS: new followers and
// follow requests notify the followed persona, and unfollows and cancelled
// requests take the notification away once nobody is left.
//
// The subject is the followed persona and there is no scope: it is about the
// recipient itself, so it is always visible.
func (w *Worker) persona(ctx context.Context, m message, eventAt time.Time) error {
	e := m.Event
	var payload shared_nats.FollowEventPayload
	if err := json.Unmarshal(m.Payload, &payload); err != nil {
		log.Printf("notifier: ignoring %s.%s with unreadable payload: %v", e.Name, e.Action, err)
		return nil
	}
	key := strconv.FormatInt(e.OwnerID, 10)

	switch {
	case e.Name == shared_nats.EventFollower && e.Action == db.EventActionEnumCreate && payload.Reason == shared_nats.ReasonFollowed:
		return w.notify(ctx, notification{
			recipientID: e.OwnerID,
			kind:        db.NotificationKindEnumNewFollower,
			subjectID:   key,
		}, payload.PersonaID, eventAt)

	case e.Name == shared_nats.EventFollower && e.Action == db.EventActionEnumDelete:
		return w.removeIfEmpty(ctx, db.NotificationKindEnumNewFollower, key, e.ActorID, eventAt)

	case e.Name == shared_nats.EventFollowRequest && e.Action == db.EventActionEnumCreate:
		return w.notify(ctx, notification{
			recipientID: e.OwnerID,
			kind:        db.NotificationKindEnumFollowRequest,
			subjectID:   key,
		}, payload.PersonaID, eventAt)

	case e.Name == shared_nats.EventFollowRequest && e.Action == db.EventActionEnumDelete:
		return w.removeIfEmpty(ctx, db.NotificationKindEnumFollowRequest, key, e.ActorID, eventAt)
	}
	return nil
}
