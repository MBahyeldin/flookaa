package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/pkg/db"
	"shared/pkg/notifications"
	"strconv"
	"time"
)

// community handles join_request and channel_request events on
// STREAM_CHANNEL_EVENTS.COMMUNITY: a request notifies the community's
// managers, and approvals and rejections notify the persona that asked.
// Cancellations notify nobody.
func (w *Worker) community(ctx context.Context, m message, eventAt time.Time) error {
	switch m.Event.Name {
	case shared_nats.EventJoinRequest:
		return w.communityJoinRequest(ctx, m, eventAt)
	case shared_nats.EventChannelRequest:
		return w.channelRequest(ctx, m, eventAt)
	}
	return nil
}

func (w *Worker) communityJoinRequest(ctx context.Context, m message, eventAt time.Time) error {
	e := m.Event
	var payload shared_nats.ChannelEventPayload
	if err := json.Unmarshal(m.Payload, &payload); err != nil {
		log.Printf("notifier: ignoring %s.%s with unreadable payload: %v", e.Name, e.Action, err)
		return nil
	}
	key := strconv.FormatInt(e.OwnerID, 10)

	if e.Action == db.EventActionEnumCreate {
		return w.notifyManagers(ctx, e.OwnerID, db.NotificationKindEnumCommunityJoinRequest, e.ActorID, eventAt)
	}
	if err := w.removeIfEmpty(ctx, db.NotificationKindEnumCommunityJoinRequest, key, e.ActorID, eventAt); err != nil {
		return err
	}
	kind := db.NotificationKindEnumCommunityRequestApproved
	switch payload.Reason {
	case shared_nats.ReasonApproved:
	case shared_nats.ReasonRejected:
		kind = db.NotificationKindEnumCommunityRequestRejected
	default:
		return nil
	}
	actorID := e.ActorID
	return w.notify(ctx, notification{
		recipientID: payload.PersonaID,
		kind:        kind,
		subjectID:   key,
		actorID:     &actorID,
	}, e.ActorID, eventAt)
}

func (w *Worker) notifyManagers(ctx context.Context, communityID int64, kind db.NotificationKindEnum, sourceActorID int64, eventAt time.Time) error {
	managers, err := w.q.ListCommunityManagerIDs(ctx, communityID)
	if err != nil {
		return fmt.Errorf("list managers of community %d: %w", communityID, err)
	}
	for _, managerID := range managers {
		if err := w.notify(ctx, notification{
			recipientID: managerID,
			kind:        kind,
			subjectID:   strconv.FormatInt(communityID, 10),
		}, sourceActorID, eventAt); err != nil {
			return err
		}
	}
	return nil
}

func (w *Worker) channelRequest(ctx context.Context, m message, eventAt time.Time) error {
	e := m.Event
	var payload shared_nats.CommunityChannelPayload
	if err := json.Unmarshal(m.Payload, &payload); err != nil {
		log.Printf("notifier: ignoring %s.%s with unreadable payload: %v", e.Name, e.Action, err)
		return nil
	}
	communityID := e.OwnerID
	key := strconv.FormatInt(communityID, 10)

	if e.Action == db.EventActionEnumCreate {
		return w.notifyManagers(ctx, communityID, db.NotificationKindEnumChannelRequest, e.ActorID, eventAt)
	}

	if err := w.removeIfEmpty(ctx, db.NotificationKindEnumChannelRequest, key, e.ActorID, eventAt); err != nil {
		return err
	}
	if payload.Reason != shared_nats.ReasonApproved && payload.Reason != shared_nats.ReasonRejected {
		return nil
	}
	if e.RecipientID == nil {
		return nil
	}
	kind := db.NotificationKindEnumChannelRequestApproved
	if payload.Reason == shared_nats.ReasonRejected {
		kind = db.NotificationKindEnumChannelRequestRejected
	}
	actorID := e.ActorID
	return w.notify(ctx, notification{
		recipientID: *e.RecipientID,
		kind:        kind,
		subjectID:   key,
		actorID:     &actorID,
		data:        &notifications.Data{ChannelID: payload.ChannelID},
	}, e.ActorID, eventAt)
}
