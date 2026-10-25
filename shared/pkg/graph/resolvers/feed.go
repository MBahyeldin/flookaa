package models

import (
	"context"
	"errors"
	"fmt"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	feedDefaultLimit = 10
	feedMaxLimit     = 30
)

var errInvalidCursor = errors.New("invalid cursor")

type feedCursor struct {
	createdAt time.Time
	id        string
}

// Mongo dates have millisecond precision, so the cursor does too.
func (c feedCursor) String() string {
	return strconv.FormatInt(c.createdAt.UnixMilli(), 10) + "_" + c.id
}

func parseFeedCursor(s string) (feedCursor, error) {
	ms, id, ok := strings.Cut(s, "_")
	if !ok || id == "" {
		return feedCursor{}, errInvalidCursor
	}
	n, err := strconv.ParseInt(ms, 10, 64)
	if err != nil {
		return feedCursor{}, errInvalidCursor
	}
	return feedCursor{createdAt: time.UnixMilli(n).UTC(), id: id}, nil
}

func (r *Resolver) feed(ctx context.Context, personaID int64, after *string, limit *int32) (*models.FeedPage, error) {
	rows, err := r.Queries.ListFeedChannels(ctx, personaID)
	if err != nil {
		return nil, fmt.Errorf("failed to list feed channels: %w", err)
	}
	channels := make([]*models.FeedChannel, len(rows))
	for i, row := range rows {
		channels[i] = &models.FeedChannel{
			ID:          row.ID,
			Name:        row.Name,
			Theme:       models.Theme(row.Theme),
			Thumbnail:   row.Thumbnail,
			CanModerate: row.CanModerate,
		}
	}
	return r.channelPostsPage(ctx, personaID, channels, after, limit)
}

func (r *Resolver) discover(ctx context.Context, personaID int64, interests []string, all *bool, after *string, limit *int32) (*models.FeedPage, error) {
	rows, err := r.Queries.ListDiscoverChannels(ctx, db.ListDiscoverChannelsParams{
		PersonaID:     personaID,
		AllChannels:   all != nil && *all,
		InterestSlugs: interests,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list discover channels: %w", err)
	}
	channels := make([]*models.FeedChannel, len(rows))
	for i, row := range rows {
		channels[i] = &models.FeedChannel{
			ID:          row.ID,
			Name:        row.Name,
			Theme:       models.Theme(row.Theme),
			Thumbnail:   row.Thumbnail,
			CanModerate: row.CanModerate,
		}
	}
	return r.channelPostsPage(ctx, personaID, channels, after, limit)
}

// channelPostsPage pages the posts of the given channels, newest first.
func (r *Resolver) channelPostsPage(ctx context.Context, personaID int64, rows []*models.FeedChannel, after *string, limit *int32) (*models.FeedPage, error) {
	page := &models.FeedPage{Posts: []*models.Post{}, Channels: []*models.FeedChannel{}}

	size := int64(feedDefaultLimit)
	if limit != nil && *limit > 0 {
		size = min(int64(*limit), feedMaxLimit)
	}
	if len(rows) == 0 {
		return page, nil
	}
	channels := make(map[int64]*models.FeedChannel, len(rows))
	channelIDs := make([]int64, len(rows))
	for i, row := range rows {
		channelIDs[i] = row.ID
		channels[row.ID] = row
	}

	filter := bson.M{
		"type":       models.PostTypePost,
		"owner.type": models.OwnerTypeChannel,
		"owner.id":   bson.M{"$in": channelIDs},
		"deletedat":  nil,
	}
	if after != nil && *after != "" {
		cursor, err := parseFeedCursor(*after)
		if err != nil {
			return nil, err
		}
		filter["$or"] = bson.A{
			bson.M{"createdat": bson.M{"$lt": cursor.createdAt}},
			bson.M{"createdat": cursor.createdAt, "id": bson.M{"$lt": cursor.id}},
		}
	}

	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	// One extra row tells whether another page exists.
	opts := options.Find().
		SetSort(bson.D{{Key: "createdat", Value: -1}, {Key: "id", Value: -1}}).
		SetLimit(size + 1)
	cur, err := r.Objects.Find(ctxTimeout, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to query feed: %w", err)
	}
	var docs []models.PostGenericDocument
	if err := cur.All(ctxTimeout, &docs); err != nil {
		return nil, fmt.Errorf("failed to decode feed: %w", err)
	}
	if int64(len(docs)) > size {
		docs = docs[:size]
		last := docs[len(docs)-1]
		next := feedCursor{createdAt: last.CreatedAt, id: last.ID}.String()
		page.NextCursor = &next
	}

	postIDs := make([]string, len(docs))
	authorIDs := make([]int64, len(docs))
	inPage := make(map[int64]bool)
	for i := range docs {
		doc := &docs[i]
		post := models.PostMapper(doc)
		meta, err := r.resolvePostMetaCached(ctx, doc.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve post meta: %w", err)
		}
		post.Meta = meta
		page.Posts = append(page.Posts, post)
		postIDs[i] = doc.ID
		authorIDs[i] = doc.AuthorID
		if !inPage[doc.Owner.ID] {
			inPage[doc.Owner.ID] = true
			page.Channels = append(page.Channels, channels[doc.Owner.ID])
		}
	}

	// Visibility doesn't depend on the channel; anonymous names do.
	authors, err := r.visiblePersonas(ctx, personaID, authorIDs)
	if err != nil {
		return nil, err
	}
	liked, err := r.likedTargets(ctx, personaID, postIDs)
	if err != nil {
		return nil, err
	}
	for _, post := range page.Posts {
		post.Author = authors[post.AuthorID]
		if post.Author == nil {
			post.Author = anonymousPersona(post.AuthorID, post.Owner.ID)
		}
		post.PersonalizedMeta = personalizedMeta(liked[post.ID])
	}
	return page, nil
}
