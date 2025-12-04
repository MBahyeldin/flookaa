package redis

import (
	"context"
	"fmt"
	"shared/pkg/db"
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

// SetPostMeta caches post metadata in Redis
func (s *ContentStore) SetPostMeta(ctx context.Context, postID string, meta *models.Meta) error {
	key := fmt.Sprintf(postMetaKeyPattern, postID)
	err := s.client.HSet(ctx, key, map[string]interface{}{
		"likes_count":    meta.LikesCount,
		"comments_count": meta.CommentsCount,
		"shares_count":   meta.SharesCount,
		"views_count":    meta.ViewsCount,
	}).Err()
	if err != nil {
		return fmt.Errorf("failed to set post meta: %w", err)
	}
	return nil
}

func (s *ContentStore) IncrementPostMeta(ctx context.Context, postID string, event db.EventEnum, val int64) error {
	key := fmt.Sprintf(postMetaKeyPattern, postID)
	switch event {
	case db.EventEnumLike:
		err := s.client.HIncrBy(ctx, key, "likes_count", val).Err()
		if err != nil {
			return fmt.Errorf("failed to increment post meta: %w", err)
		}
	case db.EventEnumComment:
		err := s.client.HIncrBy(ctx, key, "comments_count", val).Err()
		if err != nil {
			return fmt.Errorf("failed to increment post meta: %w", err)
		}
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

func (s *ContentStore) SetCommentMeta(ctx context.Context, postID string, meta *models.Meta) error {
	key := fmt.Sprintf(commentMetaKeyPattern, postID)
	err := s.client.HSet(ctx, key, map[string]interface{}{
		"likes_count":    meta.LikesCount,
		"comments_count": meta.CommentsCount,
		"shares_count":   meta.SharesCount,
		"views_count":    meta.ViewsCount,
	}).Err()
	if err != nil {
		return fmt.Errorf("failed to set Comment meta: %w", err)
	}
	return nil
}

func (s *ContentStore) IncrementCommentMeta(ctx context.Context, commentId string, event db.EventEnum, val int64) error {
	key := fmt.Sprintf(commentMetaKeyPattern, commentId)
	switch event {
	case db.EventEnumLike:
		err := s.client.HIncrBy(ctx, key, "likes_count", val).Err()
		if err != nil {
			return fmt.Errorf("failed to increment comment meta: %w", err)
		}
	case db.EventEnumComment:
		err := s.client.HIncrBy(ctx, key, "comments_count", val).Err()
		if err != nil {
			return fmt.Errorf("failed to increment comment meta: %w", err)
		}
	}
	return nil
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
