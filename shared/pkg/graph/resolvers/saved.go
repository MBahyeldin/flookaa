package models

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"shared/external/db/nats"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type savedCursor struct {
	savedAt time.Time
	postID  string
}

func (c savedCursor) String() string {
	return strconv.FormatInt(c.savedAt.UnixMicro(), 10) + "_" + c.postID
}

func parseSavedCursor(s string) (savedCursor, error) {
	us, id, ok := strings.Cut(s, "_")
	if !ok || id == "" {
		return savedCursor{}, errInvalidCursor
	}
	n, err := strconv.ParseInt(us, 10, 64)
	if err != nil {
		return savedCursor{}, errInvalidCursor
	}
	return savedCursor{savedAt: time.UnixMicro(n).UTC(), postID: id}, nil
}

func (r *Resolver) savePost(ctx context.Context, personaID int64, id string) error {
	obj, err := r.loadObject(ctx, id)
	if err != nil {
		return err
	}
	if obj.Type != models.PostTypePost {
		return errObjectNotFound
	}
	if err := r.authorizeOwner(ctx, obj.Owner, personaID, accessRead); err != nil {
		return err
	}
	changed, err := r.Queries.SavePost(ctx, db.SavePostParams{PersonaID: personaID, PostID: id})
	if err != nil {
		return fmt.Errorf("failed to save post: %w", err)
	}
	if changed > 0 {
		r.publishSaved(ctx, personaID, id, db.EventActionEnumCreate)
	}
	return nil
}

// unsavePost checks nothing but the persona, so a post that's gone or
// unreadable can still be removed.
func (r *Resolver) unsavePost(ctx context.Context, personaID int64, id string) error {
	changed, err := r.Queries.UnsavePost(ctx, db.UnsavePostParams{PersonaID: personaID, PostID: id})
	if err != nil {
		return fmt.Errorf("failed to unsave post: %w", err)
	}
	if changed > 0 {
		r.publishSaved(ctx, personaID, id, db.EventActionEnumDelete)
	}
	return nil
}

// The save is already stored; a failed publish only leaves the persona's other
// tabs stale until they reload.
func (r *Resolver) publishSaved(ctx context.Context, personaID int64, postID string, action db.EventActionEnum) {
	stream := nats.USER_EVENTS_STREAM
	owner := &models.Owner{ID: personaID, Type: models.OwnerTypePersona}
	err := r.NATS.PublishMessage(ctx,
		subject.New(&stream, owner, string(nats.EventSaved), string(action)).GetSubject(),
		&nats.MessageType{
			Event: nats.Event{
				Name:       nats.EventSaved,
				Action:     action,
				TargetId:   postID,
				TargetType: db.EventTargetTypeEnumPOST,
				Owner:      db.OwnerEnumPERSONA,
				OwnerID:    personaID,
				ActorID:    personaID,
				Timestamp:  time.Now().UnixMilli(),
			},
			Payload: nats.SavedPayload{PostID: postID},
		},
	)
	if err != nil {
		log.Println("Warning: failed to publish saved event to NATS:", err)
	}
}

// savedTargets returns which of ids personaID has saved, in one query per page.
func (r *Resolver) savedTargets(ctx context.Context, personaID int64, ids []string) (map[string]bool, error) {
	saved := make(map[string]bool, len(ids))
	if len(ids) == 0 {
		return saved, nil
	}
	rows, err := r.Queries.GetSavedTargets(ctx, db.GetSavedTargetsParams{PersonaID: personaID, PostIds: ids})
	if err != nil {
		return nil, fmt.Errorf("failed to resolve saved targets: %w", err)
	}
	for _, id := range rows {
		saved[id] = true
	}
	return saved, nil
}

// saved pages the persona's saved posts, newest saved first. Rows are never
// dropped: a post it can't show stays as an item with a null post, so the
// persona can remove it.
func (r *Resolver) saved(ctx context.Context, personaID int64, after *string, limit *int32) (*models.SavedPage, error) {
	page := &models.SavedPage{Items: []*models.SavedPost{}, Channels: []*models.FeedChannel{}}

	size := int32(feedDefaultLimit)
	if limit != nil && *limit > 0 {
		size = min(*limit, feedMaxLimit)
	}
	params := db.ListSavedPostsParams{PersonaID: personaID, RowLimit: size + 1}
	if after != nil && *after != "" {
		cursor, err := parseSavedCursor(*after)
		if err != nil {
			return nil, err
		}
		params.CursorSavedAt = sql.NullTime{Time: cursor.savedAt, Valid: true}
		params.CursorPostID = sql.NullString{String: cursor.postID, Valid: true}
	}
	rows, err := r.Queries.ListSavedPosts(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list saved posts: %w", err)
	}
	// One extra row tells whether another page exists.
	if int32(len(rows)) > size {
		rows = rows[:size]
		last := rows[len(rows)-1]
		next := savedCursor{savedAt: last.SavedAt, postID: last.PostID}.String()
		page.NextCursor = &next
	}
	if len(rows) == 0 {
		return page, nil
	}

	ids := make([]string, len(rows))
	for i, row := range rows {
		ids[i] = row.PostID
	}
	docs, err := r.savedDocs(ctx, ids)
	if err != nil {
		return nil, err
	}
	channels, walls, err := r.readableOwners(ctx, personaID, docs)
	if err != nil {
		return nil, err
	}

	posts := make(map[string]*models.Post, len(docs))
	var postIDs []string
	var authorIDs []int64
	inPage := make(map[int64]bool)
	for id, doc := range docs {
		switch doc.Owner.Type {
		case models.OwnerTypeChannel:
			channel := channels[doc.Owner.ID]
			if channel == nil {
				continue
			}
			if !inPage[channel.ID] {
				inPage[channel.ID] = true
				page.Channels = append(page.Channels, channel)
			}
		case models.OwnerTypePersona:
			if !walls[doc.Owner.ID] {
				continue
			}
		default:
			continue
		}
		post := models.PostMapper(doc)
		meta, err := r.resolvePostMetaCached(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve post meta: %w", err)
		}
		post.Meta = meta
		posts[id] = post
		postIDs = append(postIDs, id)
		authorIDs = append(authorIDs, doc.AuthorID)
	}

	authors, err := r.visiblePersonas(ctx, personaID, authorIDs)
	if err != nil {
		return nil, err
	}
	liked, err := r.likedTargets(ctx, personaID, postIDs)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		item := &models.SavedPost{PostID: row.PostID, SavedAt: row.SavedAt}
		if post := posts[row.PostID]; post != nil {
			post.Author = authors[post.AuthorID]
			if post.Author == nil {
				post.Author = anonymousPersona(post.AuthorID, post.Owner)
			}
			post.PersonalizedMeta = personalizedMeta(liked[post.ID], true)
			item.Post = post
		}
		page.Items = append(page.Items, item)
	}
	return page, nil
}

func (r *Resolver) savedDocs(ctx context.Context, ids []string) (map[string]*models.PostGenericDocument, error) {
	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	cur, err := r.Objects.Find(ctxTimeout, bson.M{
		"id":        bson.M{"$in": ids},
		"type":      models.PostTypePost,
		"deletedat": nil,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query saved posts: %w", err)
	}
	var found []models.PostGenericDocument
	if err := cur.All(ctxTimeout, &found); err != nil {
		return nil, fmt.Errorf("failed to decode saved posts: %w", err)
	}
	docs := make(map[string]*models.PostGenericDocument, len(found))
	for i := range found {
		if found[i].Owner != nil {
			docs[found[i].ID] = &found[i]
		}
	}
	return docs, nil
}

// readableOwners returns the channels and walls among docs' owners that
// personaID may read now, whatever it could read when it saved them.
func (r *Resolver) readableOwners(ctx context.Context, personaID int64, docs map[string]*models.PostGenericDocument) (map[int64]*models.FeedChannel, map[int64]bool, error) {
	var channelIDs, wallIDs []int64
	for _, doc := range docs {
		switch doc.Owner.Type {
		case models.OwnerTypeChannel:
			channelIDs = append(channelIDs, doc.Owner.ID)
		case models.OwnerTypePersona:
			wallIDs = append(wallIDs, doc.Owner.ID)
		}
	}

	channels := make(map[int64]*models.FeedChannel, len(channelIDs))
	if len(channelIDs) > 0 {
		rows, err := r.Queries.ListReadableChannels(ctx, db.ListReadableChannelsParams{PersonaID: personaID, Ids: channelIDs})
		if err != nil {
			return nil, nil, fmt.Errorf("failed to list readable channels: %w", err)
		}
		for _, row := range rows {
			channels[row.ID] = &models.FeedChannel{
				ID:          row.ID,
				Name:        row.Name,
				Theme:       models.Theme(row.Theme),
				Thumbnail:   row.Thumbnail,
				CanModerate: row.CanModerate,
			}
		}
	}

	walls := make(map[int64]bool, len(wallIDs))
	visible, err := r.visiblePersonas(ctx, personaID, wallIDs)
	if err != nil {
		return nil, nil, err
	}
	for id := range visible {
		walls[id] = true
	}
	return channels, walls, nil
}
