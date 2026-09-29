package channels

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

// publish announces a membership change on the channel's subject. The change
// is already stored, so a failed publish is logged rather than failing the
// request; realtime views catch up on their next load.
func (h *Handler) publish(ctx context.Context, channelID, actorID int64, event db.EventEnum, action db.EventActionEnum, personaID int64, reason string) {
	streamName := nats.CHANNEL_EVENTS_STREAM
	subj := subject.New(&streamName, &models.Owner{
		ID:   channelID,
		Type: models.OwnerTypeChannel,
	}, string(event), string(action)).GetSubject()

	message := &nats.MessageType{
		Event: nats.Event{
			Name:       event,
			Action:     action,
			TargetId:   strconv.FormatInt(channelID, 10),
			TargetType: db.EventTargetTypeEnumCHANNEL,
			Owner:      db.OwnerEnumCHANNEL,
			OwnerID:    channelID,
			ActorID:    actorID,
			Timestamp:  time.Now().UnixMilli(),
		},
		Payload: nats.ChannelEventPayload{PersonaID: personaID, Reason: reason},
	}
	if err := h.nats.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("Warning: failed to publish %s.%s for channel %d: %v", event, action, channelID, err)
	}
}
