package redis

import (
	"context"
	"fmt"
	"shared/pkg/graph/models"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type ContentStore struct {
	client *redis.Client
	ttl    time.Duration
}

func newContentStore(client *redis.Client, ttl time.Duration) *ContentStore {
	return &ContentStore{
		client: client,
		ttl:    ttl,
	}
}

const postMetaKeyPattern = "content:post:%s"
const commentMetaKeyPattern = "content:comment:%s"

// contentMetaTTL bounds how long a wrong count can survive if an event is
// ever lost: the next read after expiry recounts from Postgres.
const contentMetaTTL = 24 * time.Hour

// Counters are never incremented in Redis. Postgres events are the source of
// truth; Redis holds whole recounts:
//   - SetPostMeta/SetCommentMeta overwrite (the redis worker, after an event).
//   - FillPostMeta/FillCommentMeta only write missing fields (read-through on
//     a cache miss), so a slower cache fill can never clobber a newer recount.

// SetPostMeta overwrites the cached counters for a post.
func (s *ContentStore) SetPostMeta(ctx context.Context, postID string, meta *models.Meta) error {
	return s.writeMeta(ctx, fmt.Sprintf(postMetaKeyPattern, postID), meta, true)
}

// FillPostMeta caches counters for a post only where none are cached yet.
func (s *ContentStore) FillPostMeta(ctx context.Context, postID string, meta *models.Meta) error {
	return s.writeMeta(ctx, fmt.Sprintf(postMetaKeyPattern, postID), meta, false)
}

func (s *ContentStore) writeMeta(ctx context.Context, key string, meta *models.Meta, overwrite bool) error {
	var commentsCount int32
	if meta.CommentsCount != nil {
		commentsCount = *meta.CommentsCount
	}
	fields := map[string]interface{}{
		"likes_count":    meta.LikesCount,
		"comments_count": commentsCount,
		"shares_count":   meta.SharesCount,
		"views_count":    meta.ViewsCount,
	}

	_, err := s.client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		if overwrite {
			pipe.HSet(ctx, key, fields)
		} else {
			for field, value := range fields {
				pipe.HSetNX(ctx, key, field, value)
			}
		}
		pipe.Expire(ctx, key, contentMetaTTL)
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to write meta %s: %w", key, err)
	}
	return nil
}

// GetPosts retrieves post metadata from Redis
func (s *ContentStore) GetPostMeta(ctx context.Context, postID string) (*models.Meta, error) {
	key := fmt.Sprintf(postMetaKeyPattern, postID)
	val, err := s.client.HGetAll(ctx, key).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get post meta: %w", err)
	}
	if len(val) == 0 {
		return nil, nil
	}
	return getMeta(val), nil
}

func (s *ContentStore) DeletePostMeta(ctx context.Context, postID string) error {
	key := fmt.Sprintf(postMetaKeyPattern, postID)
	return s.client.Del(ctx, key).Err()
}

// SetCommentMeta overwrites the cached counters for a comment.
func (s *ContentStore) SetCommentMeta(ctx context.Context, commentID string, meta *models.Meta) error {
	return s.writeMeta(ctx, fmt.Sprintf(commentMetaKeyPattern, commentID), meta, true)
}

// FillCommentMeta caches counters for a comment only where none are cached yet.
func (s *ContentStore) FillCommentMeta(ctx context.Context, commentID string, meta *models.Meta) error {
	return s.writeMeta(ctx, fmt.Sprintf(commentMetaKeyPattern, commentID), meta, false)
}

func (s *ContentStore) GetCommentMeta(ctx context.Context, commentId string) (*models.Meta, error) {
	key := fmt.Sprintf(commentMetaKeyPattern, commentId)
	val, err := s.client.HGetAll(ctx, key).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get Comment meta: %w", err)
	}
	if len(val) == 0 {
		return nil, nil
	}
	return getMeta(val), nil
}

func (s *ContentStore) DeleteCommentMeta(ctx context.Context, postID string) error {
	key := fmt.Sprintf(commentMetaKeyPattern, postID)
	return s.client.Del(ctx, key).Err()
}

func getMeta(val map[string]string) *models.Meta {
	likesCount, err := strconv.Atoi(val["likes_count"])
	if err != nil {
		likesCount = 0
	}
	commentsCount, err := strconv.Atoi(val["comments_count"])
	if err != nil {
		commentsCount = 0
	}
	sharesCount, err := strconv.Atoi(val["shares_count"])
	if err != nil {
		sharesCount = 0
	}

	commentsCount32 := int32(commentsCount)

	return &models.Meta{
		LikesCount:    int32(likesCount),
		CommentsCount: &commentsCount32,
		SharesCount:   int32(sharesCount),
		ViewsCount:    0,
	}
}
