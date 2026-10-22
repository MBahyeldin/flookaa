package followers

import (
	"context"
	"log"
	"shared/external/db/nats"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"strconv"
	"time"
)

// publish announces a follow change on the followed persona's subject. The
// change is already stored, so a failed publish is logged, not returned.
func (h *Handler) publish(ctx context.Context, personaID, followerID int64, event db.EventEnum, action db.EventActionEnum, reason string) {
	h.publishBy(ctx, personaID, followerID, followerID, event, action, reason)
}

// publishBy is publish for a change made by someone other than the follower,
// e.g. the followed persona approving or removing it.
func (h *Handler) publishBy(ctx context.Context, personaID, actorID, followerID int64, event db.EventEnum, action db.EventActionEnum, reason string) {
	streamName := nats.USER_EVENTS_STREAM
	subj := subject.New(&streamName, &models.Owner{
		ID:   personaID,
		Type: models.OwnerTypePersona,
	}, string(event), string(action)).GetSubject()

	message := &nats.MessageType{
		Event: nats.Event{
			Name:       event,
			Action:     action,
			TargetId:   strconv.FormatInt(personaID, 10),
			TargetType: db.EventTargetTypeEnumPERSONA,
			Owner:      db.OwnerEnumPERSONA,
			OwnerID:    personaID,
			ActorID:    actorID,
			Timestamp:  time.Now().UnixMilli(),
		},
		Payload: nats.FollowEventPayload{PersonaID: followerID, Reason: reason},
	}
	if err := h.nats.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("Warning: failed to publish %s.%s for persona %d: %v", event, action, personaID, err)
	}
}

// publishCounts tells open profiles of these personas to refetch their counts.
func (h *Handler) publishCounts(ctx context.Context, personaIDs ...int64) {
	streamName := nats.USER_EVENTS_STREAM
	for _, id := range personaIDs {
		subj := subject.New(&streamName, &models.Owner{
			ID:   id,
			Type: models.OwnerTypePersona,
		}, string(nats.EventFollowCounts), string(db.EventActionEnumUpdate)).GetSubject()

		message := &nats.MessageType{
			Event: nats.Event{
				Name:       nats.EventFollowCounts,
				Action:     db.EventActionEnumUpdate,
				TargetId:   strconv.FormatInt(id, 10),
				TargetType: db.EventTargetTypeEnumPERSONA,
				Owner:      db.OwnerEnumPERSONA,
				OwnerID:    id,
				Timestamp:  time.Now().UnixMilli(),
			},
		}
		if err := h.nats.PublishMessage(ctx, subj, message); err != nil {
			log.Printf("Warning: failed to publish %s for persona %d: %v", subj, id, err)
		}
	}
}
