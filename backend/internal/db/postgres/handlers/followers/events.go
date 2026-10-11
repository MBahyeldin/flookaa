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
			ActorID:    followerID,
			Timestamp:  time.Now().UnixMilli(),
		},
		Payload: nats.FollowEventPayload{PersonaID: followerID, Reason: reason},
	}
	if err := h.nats.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("Warning: failed to publish %s.%s for persona %d: %v", event, action, personaID, err)
	}
}
