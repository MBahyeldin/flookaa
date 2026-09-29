package internal

import (
	"context"
	"encoding/json"
	"log"
	"shared/pkg/db"
	"shared/pkg/notifications"
	"time"
)

// content handles STREAM_CONTENT_EVENTS: comments and likes notify the
// author of what was commented on or liked; deletes take notifications away.
func (w *Worker) content(ctx context.Context, m message, eventAt time.Time) error {
	e := m.Event
	// Only channel-owned content exists (and has access rules) for now.
	if e.Owner != db.OwnerEnumCHANNEL {
		return nil
	}

	switch {
	case e.Name == db.EventEnumComment && e.Action == db.EventActionEnumCreate:
		kind, ok := commentKind(e.TargetType)
		if !ok || e.RecipientID == nil {
			// No recipient: published before the backend set recipient_id.
			return nil
		}
		return w.notify(ctx, notification{
			recipientID: *e.RecipientID,
			kind:        kind,
			subjectID:   e.TargetId,
			scope:       channelScope(e.OwnerID),
			data:        contentData(e.PostID),
		}, e.ActorID, eventAt)

	case e.Name == db.EventEnumLike && e.Action == db.EventActionEnumCreate:
		kind, ok := likeKind(e.TargetType)
		if !ok || e.RecipientID == nil {
			return nil
		}
		return w.notify(ctx, notification{
			recipientID: *e.RecipientID,
			kind:        kind,
			subjectID:   e.TargetId,
			scope:       channelScope(e.OwnerID),
			data:        contentData(e.PostID),
		}, e.ActorID, eventAt)

	case e.Name == db.EventEnumLike && e.Action == db.EventActionEnumDelete:
		kind, ok := likeKind(e.TargetType)
		if !ok {
			return nil
		}
		return w.removeIfEmpty(ctx, kind, e.TargetId, e.ActorID, eventAt)

	case (e.Name == db.EventEnumPost || e.Name == db.EventEnumComment) && e.Action == db.EventActionEnumDelete:
		var payload struct {
			ObjectID string `json:"object_id"`
		}
		if err := json.Unmarshal(m.Payload, &payload); err != nil || payload.ObjectID == "" {
			log.Printf("notifier: ignoring %s.delete without object_id: %v", e.Name, err)
			return nil
		}
		if e.Name == db.EventEnumPost {
			return w.removeSubject(ctx, db.NotificationSubjectEnumPOST, payload.ObjectID, e.ActorID, eventAt)
		}
		if err := w.removeSubject(ctx, db.NotificationSubjectEnumCOMMENT, payload.ObjectID, e.ActorID, eventAt); err != nil {
			return err
		}
		// The deleted comment's event is soft-deleted, so its parent may
		// have no other commenters left. A comment event targets its parent.
		kind, ok := commentKind(e.TargetType)
		if !ok {
			return nil
		}
		return w.removeIfEmpty(ctx, kind, e.TargetId, e.ActorID, eventAt)
	}
	return nil
}

// commentKind is the notification for a comment on a target of type t.
func commentKind(t db.EventTargetTypeEnum) (db.NotificationKindEnum, bool) {
	switch t {
	case db.EventTargetTypeEnumPOST:
		return db.NotificationKindEnumPostComment, true
	case db.EventTargetTypeEnumCOMMENT:
		return db.NotificationKindEnumCommentReply, true
	}
	return "", false
}

// likeKind is the notification for a like on a target of type t.
func likeKind(t db.EventTargetTypeEnum) (db.NotificationKindEnum, bool) {
	switch t {
	case db.EventTargetTypeEnumPOST:
		return db.NotificationKindEnumPostLike, true
	case db.EventTargetTypeEnumCOMMENT:
		return db.NotificationKindEnumCommentLike, true
	}
	return "", false
}

// contentData links a content notification to its post. Events published
// before the backend set post_id have none; the UI then links to the channel.
func contentData(postID string) *notifications.Data {
	if postID == "" {
		return nil
	}
	return &notifications.Data{PostID: postID}
}
