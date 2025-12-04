package redis

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"shared/pkg/db"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type UserStore struct {
	client *redis.Client
	ttl    time.Duration
}

type UserActivity struct {
	Likes    []string
	Comments []string
	Posts    []string
	Replies  []string
}

func newUserStore(client *redis.Client, ttl time.Duration) *UserStore {
	return &UserStore{
		client: client,
		ttl:    ttl,
	}
}

const userInfoKeyPattern = "user:%s:info"
const userActivityPostsKeyPattern = "user:%s:activity:posts"
const userActivityLikesKeyPattern = "user:%s:activity:likes"
const userActivityCommentsKeyPattern = "user:%s:activity:comments"
const userActivityRepliesKeyPattern = "user:%s:activity:replies"

// SetUser caches a user profile in Redis
func (s *UserStore) SetUserInfo(ctx context.Context, user *db.ResolveUserByIDRow) error {
	data, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	key := fmt.Sprintf(userInfoKeyPattern, strconv.Itoa(int(user.ID)))
	return s.client.Set(ctx, key, data, s.ttl).Err()
}

// GetUser retrieves a user profile from Redis
func (s *UserStore) GetUserInfo(ctx context.Context, userID string) (*db.ResolveUserByIDRow, error) {
	key := fmt.Sprintf(userInfoKeyPattern, userID)
	val, err := s.client.Get(ctx, key).Result()
	if err == redis.Nil {
		// Cache miss
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	var user db.ResolveUserByIDRow
	if err := json.Unmarshal([]byte(val), &user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}
	return &user, nil
}

// DeleteUser removes a cached user
func (s *UserStore) DeleteUserInfo(ctx context.Context, userID string) error {
	key := fmt.Sprintf(userInfoKeyPattern, userID)
	return s.client.Del(ctx, key).Err()
}

func (s *UserStore) InitUserActivityIfNotSet(ctx context.Context, userID int64, pg *sql.DB) error {
	// Check if the sets already exist
	postsKey := fmt.Sprintf(userActivityPostsKeyPattern, strconv.Itoa(int(userID)))
	likesKey := fmt.Sprintf(userActivityLikesKeyPattern, strconv.Itoa(int(userID)))
	commentsKey := fmt.Sprintf(userActivityCommentsKeyPattern, strconv.Itoa(int(userID)))
	repliesKey := fmt.Sprintf(userActivityRepliesKeyPattern, strconv.Itoa(int(userID)))

	exists, err := s.client.Exists(ctx, postsKey, likesKey, commentsKey, repliesKey).Result()
	if err != nil {
		return fmt.Errorf("failed to check if user activity sets exist: %w", err)
	}

	if exists == 0 {
		q := db.New(pg)
		userActivities, err := q.GetUserActivities(ctx, int64(userID))
		if err != nil {
			return fmt.Errorf("failed to get user activities from postgres: %w", err)
		}
		cachedActivities := &UserActivity{}
		for _, activity := range userActivities {
			cachedActivities.Comments = append(cachedActivities.Comments, activity.CommentTargets...)
			cachedActivities.Posts = append(cachedActivities.Posts, activity.PostTargets...)
			cachedActivities.Likes = append(cachedActivities.Likes, activity.LikeTargets...)
		}
		_ = s.SetUserActivities(ctx, userID, cachedActivities)
	}
	return nil
}

func (s *UserStore) SetUserActivities(ctx context.Context, userID int64, activities *UserActivity) error {
	if activities == nil {
		return fmt.Errorf("activities cannot be nil")
	}
	if activities.Posts != nil {
		s.client.SAdd(ctx, fmt.Sprintf(userActivityPostsKeyPattern, strconv.Itoa(int(userID))), activities.Posts)
	}
	if activities.Likes != nil {
		s.client.SAdd(ctx, fmt.Sprintf(userActivityLikesKeyPattern, strconv.Itoa(int(userID))), activities.Likes)
	}
	if activities.Comments != nil {
		s.client.SAdd(ctx, fmt.Sprintf(userActivityCommentsKeyPattern, strconv.Itoa(int(userID))), activities.Comments)
	}
	if activities.Replies != nil {
		s.client.SAdd(ctx, fmt.Sprintf(userActivityRepliesKeyPattern, strconv.Itoa(int(userID))), activities.Replies)
	}
	return nil
}

func (s *UserStore) AddToUserActivity(ctx context.Context, userID int64, activityID string, activityType db.EventEnum) error {
	if bol, err := s.IsUserActivity(ctx, userID, activityID, activityType); err != nil {
		return err
	} else if bol {
		return nil
	}
	switch activityType {
	case db.EventEnumPost:
		return s.client.SAdd(ctx, fmt.Sprintf(userActivityPostsKeyPattern, strconv.Itoa(int(userID))), activityID).Err()
	case db.EventEnumLike:
		return s.client.SAdd(ctx, fmt.Sprintf(userActivityLikesKeyPattern, strconv.Itoa(int(userID))), activityID).Err()
	case db.EventEnumComment:
		return s.client.SAdd(ctx, fmt.Sprintf(userActivityCommentsKeyPattern, strconv.Itoa(int(userID))), activityID).Err()
	default:
		return fmt.Errorf("invalid activity type: %s", activityType)
	}
}

func (s *UserStore) RemoveFromUserActivity(ctx context.Context, userID int64, activityID string, activityType db.EventEnum) error {
	switch activityType {
	case db.EventEnumPost:
		return s.client.SRem(ctx, fmt.Sprintf(userActivityPostsKeyPattern, strconv.Itoa(int(userID))), activityID).Err()
	case db.EventEnumLike:
		return s.client.SRem(ctx, fmt.Sprintf(userActivityLikesKeyPattern, strconv.Itoa(int(userID))), activityID).Err()
	case db.EventEnumComment:
		return s.client.SRem(ctx, fmt.Sprintf(userActivityCommentsKeyPattern, strconv.Itoa(int(userID))), activityID).Err()
	default:
		return fmt.Errorf("invalid activity type: %s", activityType)
	}
}

func (s *UserStore) IsUserActivity(ctx context.Context, userID int64, activityID string, activityType db.EventEnum) (bool, error) {
	var isMember bool
	var err error
	switch activityType {
	case db.EventEnumPost:
		isMember, err = s.client.SIsMember(ctx, fmt.Sprintf(userActivityPostsKeyPattern, strconv.Itoa(int(userID))), activityID).Result()
	case db.EventEnumLike:
		isMember, err = s.client.SIsMember(ctx, fmt.Sprintf(userActivityLikesKeyPattern, strconv.Itoa(int(userID))), activityID).Result()
	case db.EventEnumComment:
		isMember, err = s.client.SIsMember(ctx, fmt.Sprintf(userActivityCommentsKeyPattern, strconv.Itoa(int(userID))), activityID).Result()
	default:
		return false, fmt.Errorf("invalid activity type: %s", activityType)
	}
	if err != nil {
		return false, fmt.Errorf("failed to check if user %s activity: %w", activityType, err)
	}
	return isMember, nil
}

// TODO: Add methods to remove/add specific activities if needed

func (s *UserStore) DeleteUserActivities(ctx context.Context, userID int32) error {
	s.client.Del(ctx, fmt.Sprintf(userActivityPostsKeyPattern, strconv.Itoa(int(userID))))
	s.client.Del(ctx, fmt.Sprintf(userActivityLikesKeyPattern, strconv.Itoa(int(userID))))
	s.client.Del(ctx, fmt.Sprintf(userActivityCommentsKeyPattern, strconv.Itoa(int(userID))))
	s.client.Del(ctx, fmt.Sprintf(userActivityRepliesKeyPattern, strconv.Itoa(int(userID))))
	return nil
}
