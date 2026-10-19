package communities

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

// publishMembership announces a stored member, follower or join_request change,
// so a failed publish is only logged.
func (h *Handler) publishMembership(ctx context.Context, communityID, actorID int64, event db.EventEnum, action db.EventActionEnum, personaID int64, reason string) {
	stream := nats.CHANNEL_EVENTS_STREAM
	subj := subject.New(&stream, &models.Owner{ID: communityID, Type: subject.OwnerTypeCommunity}, string(event), string(action)).GetSubject()
	message := &nats.MessageType{
		Event: nats.Event{
			Name:       event,
			Action:     action,
			TargetId:   strconv.FormatInt(communityID, 10),
			TargetType: nats.TargetCommunity,
			Owner:      nats.OwnerCommunity,
			OwnerID:    communityID,
			ActorID:    actorID,
			Timestamp:  time.Now().UnixMilli(),
		},
		Payload: nats.ChannelEventPayload{PersonaID: personaID, Reason: reason},
	}
	if err := h.nats.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("Warning: failed to publish %s.%s for community %d: %v", event, action, communityID, err)
	}
}

func (h *Handler) publishCounts(ctx context.Context, communityID, actorID int64) {
	Publish(ctx, h.nats, communityID, actorID, nats.EventCommunityCounts)
}
