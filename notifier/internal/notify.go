package internal

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/notifications"
	"shared/pkg/subject"
	"strconv"
	"time"

	"github.com/sqlc-dev/pqtype"
)

// scope is whose access rule decides whether the recipient may see a
// notification. A notification without one is personal, always visible.
type scope struct {
	typ db.NotificationScopeEnum
	id  int64
}

// channelScope is the scope of content inside a channel.
func channelScope(channelID int64) *scope {
	return &scope{typ: db.NotificationScopeEnumCHANNEL, id: channelID}
}

// notification is one row to create or bring back to the top. Its subject
// type comes from the kind's spec in shared/pkg/notifications.
type notification struct {
	recipientID int64
	kind        db.NotificationKindEnum
	subjectID   string
	scope       *scope
	actorID     *int64
	data        *notifications.Data
}

// notify upserts n for activity by sourceActorID at eventAt and tells the
// recipient's browsers. Nobody is notified about their own activity.
func (w *Worker) notify(ctx context.Context, n notification, sourceActorID int64, eventAt time.Time) error {
	if n.recipientID == sourceActorID {
		return nil
	}
	spec, err := notifications.Lookup(n.kind)
	if err != nil {
		return err
	}

	params := db.UpsertNotificationParams{
		RecipientID: n.recipientID,
		Kind:        n.kind,
		GroupKey:    notifications.GroupKey(n.kind, n.subjectID),
		SubjectType: spec.Subject,
		SubjectID:   n.subjectID,
		EventAt:     eventAt,
	}
	if n.scope != nil {
		params.ScopeType = db.NullNotificationScopeEnum{NotificationScopeEnum: n.scope.typ, Valid: true}
		params.ScopeID = sql.NullInt64{Int64: n.scope.id, Valid: true}
	}
	if n.actorID != nil {
		params.ActorID = sql.NullInt64{Int64: *n.actorID, Valid: true}
	}
	if n.data != nil {
		raw, err := json.Marshal(n.data)
		if err != nil {
			return fmt.Errorf("marshal data for %s: %w", params.GroupKey, err)
		}
		params.Data = pqtype.NullRawMessage{RawMessage: raw, Valid: true}
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

// removeIfEmpty soft-deletes the (kind, subject) notifications once nobody
// but the recipient is left in the recount, e.g. after the last unlike.
// Single-actor kinds have no recount and are never removed this way.
//
// Content groups have one recipient (the author) and a join_request group's
// recount is the same for every moderator, so one non-zero recount keeps the
// whole group.
func (w *Worker) removeIfEmpty(ctx context.Context, kind db.NotificationKindEnum, subjectID string, sourceActorID int64, eventAt time.Time) error {
	spec, err := notifications.Lookup(kind)
	if err != nil {
		return err
	}
	if spec.Recount == nil {
		return nil
	}

	gk := notifications.GroupKey(kind, subjectID)
	recipients, err := w.q.ListNotificationRecipientsByGroup(ctx, gk)
	if err != nil {
		return fmt.Errorf("list recipients of %s: %w", gk, err)
	}
	if len(recipients) == 0 {
		return nil
	}
	for _, recipientID := range recipients {
		counts, err := spec.Recount(ctx, w.q, recipientID, []string{subjectID})
		if err != nil {
			return fmt.Errorf("recount %s: %w", gk, err)
		}
		if counts[subjectID].Count > 0 {
			return nil
		}
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

// removeSubject soft-deletes every notification about a subject that went
// away, e.g. a deleted post or comment.
func (w *Worker) removeSubject(ctx context.Context, subjectType db.NotificationSubjectEnum, subjectID string, sourceActorID int64, eventAt time.Time) error {
	removed, err := w.q.SoftDeleteNotificationsBySubject(ctx, db.SoftDeleteNotificationsBySubjectParams{
		SubjectType: subjectType,
		SubjectID:   subjectID,
		EventAt:     eventAt,
	})
	if err != nil {
		return fmt.Errorf("remove notifications about %s %s: %w", subjectType, subjectID, err)
	}
	for _, r := range removed {
		w.publish(ctx, db.EventActionEnumDelete, r.ID, r.RecipientID, sourceActorID)
	}
	return nil
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
