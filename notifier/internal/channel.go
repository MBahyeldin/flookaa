package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/pkg/db"
	"strconv"
	"time"
)

// channel handles STREAM_CHANNEL_EVENTS: join requests notify the channel's
// moderators, and approvals and removals notify the persona concerned.
// Joins, leaves, follows, rejections and cancellations notify nobody.
func (w *Worker) channel(ctx context.Context, m message, eventAt time.Time) error {
	e := m.Event
	var payload shared_nats.ChannelEventPayload
	if err := json.Unmarshal(m.Payload, &payload); err != nil {
		log.Printf("notifier: ignoring %s.%s with unreadable payload: %v", e.Name, e.Action, err)
		return nil
	}
	channelID := e.OwnerID
	key := strconv.FormatInt(channelID, 10)

	switch {
	case e.Name == shared_nats.EventJoinRequest && e.Action == db.EventActionEnumCreate:
		moderators, err := w.q.ListChannelModeratorIDs(ctx, channelID)
		if err != nil {
			return fmt.Errorf("list moderators of channel %d: %w", channelID, err)
		}
		for _, moderatorID := range moderators {
			// A failure NAKs the whole event; moderators already notified
			// are no-ops on redelivery.
			if err := w.notify(ctx, notification{
				recipientID: moderatorID,
				kind:        db.NotificationKindEnumJoinRequest,
				key:         key,
				channelID:   channelID,
			}, e.ActorID, eventAt); err != nil {
				return err
			}
		}
		return nil

	case e.Name == shared_nats.EventJoinRequest && e.Action == db.EventActionEnumDelete:
		// Approved, rejected or cancelled: gone once nothing is pending.
		return w.removeIfEmpty(ctx, db.NotificationKindEnumJoinRequest, key, e.ActorID, eventAt)

	case e.Name == shared_nats.EventMember && e.Action == db.EventActionEnumCreate && payload.Reason == shared_nats.ReasonApproved:
		actorID := e.ActorID
		return w.notify(ctx, notification{
			recipientID: payload.PersonaID,
			kind:        db.NotificationKindEnumRequestApproved,
			key:         key,
			channelID:   channelID,
			actorID:     &actorID,
		}, e.ActorID, eventAt)

	case e.Name == shared_nats.EventMember && e.Action == db.EventActionEnumDelete && payload.Reason == shared_nats.ReasonRemoved:
		actorID := e.ActorID
		return w.notify(ctx, notification{
			recipientID: payload.PersonaID,
			kind:        db.NotificationKindEnumRemovedFromChannel,
			key:         key,
			channelID:   channelID,
			actorID:     &actorID,
		}, e.ActorID, eventAt)
	}
	return nil
}
