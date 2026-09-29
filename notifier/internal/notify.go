package internal

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"strconv"
	"time"
)

// groupKey names the thing a notification is about, e.g. "post_like:<post
// id>" or "join_request:<channel id>". Repeated activity on it updates one
// row per recipient.
func groupKey(kind db.NotificationKindEnum, key string) string {
	return string(kind) + ":" + key
}

// notification is one row to create or bring back to the top.
type notification struct {
	recipientID int64
	kind        db.NotificationKindEnum
	key         string
	objectID    string // post or comment; empty for membership kinds
	channelID   int64
	actorID     *int64
}

// notify upserts n for activity by sourceActorID at eventAt and tells the
// recipient's browsers. Nobody is notified about their own activity.
func (w *Worker) notify(ctx context.Context, n notification, sourceActorID int64, eventAt time.Time) error {
	if n.recipientID == sourceActorID {
		return nil
	}

	params := db.UpsertNotificationParams{
		RecipientID: n.recipientID,
		Kind:        n.kind,
		GroupKey:    groupKey(n.kind, n.key),
		ObjectID:    sql.NullString{String: n.objectID, Valid: n.objectID != ""},
		ChannelID:   n.channelID,
		EventAt:     eventAt,
	}
	if n.actorID != nil {
		params.ActorID = sql.NullInt64{Int64: *n.actorID, Valid: true}
	}

	id, err := w.q.UpsertNotification(ctx, params)
	if errors.Is(err, sql.ErrNoRows) {
		// Not newer than what the row already reflects: a replay.
		return nil
	}
	if err != nil {
		return fmt.Errorf("upsert %s for persona %d: %w", params.GroupKey, n.recipientID, err)
	}
	w.publish(ctx, db.EventActionEnumCreate, id, n.recipientID, sourceActorID)
	return nil
}

// removeIfEmpty soft-deletes the (kind, key) notifications once nobody but
// the recipient is left in the recount, e.g. after the last unlike.
//
// Content groups have one recipient (the author) and a join_request group's
// recount is the same for every moderator, so one non-zero recount keeps the
// whole group.
func (w *Worker) removeIfEmpty(ctx context.Context, kind db.NotificationKindEnum, key string, sourceActorID int64, eventAt time.Time) error {
	gk := groupKey(kind, key)
	recipients, err := w.q.ListNotificationRecipientsByGroup(ctx, gk)
	if err != nil {
		return fmt.Errorf("list recipients of %s: %w", gk, err)
	}
	for _, recipientID := range recipients {
		count, err := w.recount(ctx, kind, key, recipientID)
		if err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
	}
	if len(recipients) == 0 {
		return nil
	}

	removed, err := w.q.SoftDeleteNotificationsByGroup(ctx, db.SoftDeleteNotificationsByGroupParams{
		GroupKey: gk,
		EventAt:  eventAt,
	})
	if err != nil {
		return fmt.Errorf("remove %s: %w", gk, err)
	}
	for _, r := range removed {
		w.publish(ctx, db.EventActionEnumDelete, r.ID, r.RecipientID, sourceActorID)
	}
	return nil
}

// removeObject soft-deletes every notification about a deleted post or comment.
func (w *Worker) removeObject(ctx context.Context, objectID string, sourceActorID int64, eventAt time.Time) error {
	removed, err := w.q.SoftDeleteNotificationsByObject(ctx, db.SoftDeleteNotificationsByObjectParams{
		ObjectID: objectID,
		EventAt:  eventAt,
	})
	if err != nil {
		return fmt.Errorf("remove notifications about %s: %w", objectID, err)
	}
	for _, r := range removed {
		w.publish(ctx, db.EventActionEnumDelete, r.ID, r.RecipientID, sourceActorID)
	}
	return nil
}

// recount returns how many personas other than the recipient are behind an
// aggregated notification. Single-actor kinds are never removed by a recount.
func (w *Worker) recount(ctx context.Context, kind db.NotificationKindEnum, key string, recipientID int64) (int64, error) {
	switch kind {
	case db.NotificationKindEnumPostComment, db.NotificationKindEnumCommentReply:
		rows, err := w.q.RecountCommenters(ctx, db.RecountCommentersParams{
			TargetIds:   []string{key},
			RecipientID: recipientID,
		})
		if err != nil || len(rows) == 0 {
			return 0, wrapRecount(kind, key, err)
		}
		return rows[0].Count, nil
	case db.NotificationKindEnumPostLike, db.NotificationKindEnumCommentLike:
		rows, err := w.q.RecountLikers(ctx, db.RecountLikersParams{
			ObjectIds:   []string{key},
			RecipientID: recipientID,
		})
		if err != nil || len(rows) == 0 {
			return 0, wrapRecount(kind, key, err)
		}
		return rows[0].Count, nil
	case db.NotificationKindEnumJoinRequest:
		channelID, err := strconv.ParseInt(key, 10, 64)
		if err != nil {
			return 0, wrapRecount(kind, key, err)
		}
		rows, err := w.q.RecountPendingJoinRequests(ctx, db.RecountPendingJoinRequestsParams{
			ChannelIds:  []int64{channelID},
			RecipientID: recipientID,
		})
		if err != nil || len(rows) == 0 {
			return 0, wrapRecount(kind, key, err)
		}
		return rows[0].Count, nil
	default:
		return 1, nil
	}
}

func wrapRecount(kind db.NotificationKindEnum, key string, err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("recount %s: %w", groupKey(kind, key), err)
}

// publish tells the recipient's browsers that notification id was created
// (or moved to the top) or deleted. The row is already stored, so a failed
// publish is logged, not retried: the browser catches up on its next load.
func (w *Worker) publish(ctx context.Context, action db.EventActionEnum, id, recipientID, actorID int64) {
	streamName := shared_nats.USER_EVENTS_STREAM
	subj := subject.New(&streamName, &models.Owner{
		ID:   recipientID,
		Type: models.OwnerTypePersona,
	}, string(shared_nats.EventNotification), string(action)).GetSubject()

	message := &shared_nats.MessageType{
		Event: shared_nats.Event{
			Name:       shared_nats.EventNotification,
			Action:     action,
			TargetId:   strconv.FormatInt(id, 10),
			TargetType: db.EventTargetTypeEnumPERSONA,
			Owner:      db.OwnerEnumPERSONA,
			OwnerID:    recipientID,
			ActorID:    actorID,
			Timestamp:  time.Now().UnixMilli(),
		},
		Payload: shared_nats.NotificationPayload{NotificationID: id},
	}
	if err := w.nats.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("notifier: failed to publish %s for notification %d: %v", action, id, err)
	}
}
