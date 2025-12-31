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

type PersonaStore struct {
	client *redis.Client
	ttl    time.Duration
}

type PersonaActivity struct {
	Likes    []string
	Comments []string
	Posts    []string
	Replies  []string
}

func newPersonaStore(client *redis.Client, ttl time.Duration) *PersonaStore {
	return &PersonaStore{
		client: client,
		ttl:    ttl,
	}
}

const personaInfoKeyPattern = "persona:%s:info"
const personaActivityPostsKeyPattern = "persona:%s:activity:posts"
const personaActivityLikesKeyPattern = "persona:%s:activity:likes"
const personaActivityCommentsKeyPattern = "persona:%s:activity:comments"
const personaActivityRepliesKeyPattern = "persona:%s:activity:replies"

// SetPersona caches a persona profile in Redis
func (s *PersonaStore) SetPersonaInfo(ctx context.Context, persona *db.ResolvePersonaByIDRow) error {
	data, err := json.Marshal(persona)
	if err != nil {
		return fmt.Errorf("failed to marshal persona: %w", err)
	}

	key := fmt.Sprintf(personaInfoKeyPattern, strconv.Itoa(int(persona.ID)))
	return s.client.Set(ctx, key, data, s.ttl).Err()
}

// GetPersona retrieves a persona profile from Redis
func (s *PersonaStore) GetPersonaInfo(ctx context.Context, personaID string) (*db.ResolvePersonaByIDRow, error) {
	key := fmt.Sprintf(personaInfoKeyPattern, personaID)
	val, err := s.client.Get(ctx, key).Result()
	if err == redis.Nil {
		// Cache miss
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get persona: %w", err)
	}

	var persona db.ResolvePersonaByIDRow
	if err := json.Unmarshal([]byte(val), &persona); err != nil {
		return nil, fmt.Errorf("failed to unmarshal persona: %w", err)
	}
	return &persona, nil
}

// DeletePersona removes a cached persona
func (s *PersonaStore) DeletePersonaInfo(ctx context.Context, personaID string) error {
	key := fmt.Sprintf(personaInfoKeyPattern, personaID)
	return s.client.Del(ctx, key).Err()
}

func (s *PersonaStore) InitPersonaActivityIfNotSet(ctx context.Context, personaID int64, pg *sql.DB) error {
	// Check if the sets already exist
	postsKey := fmt.Sprintf(personaActivityPostsKeyPattern, strconv.Itoa(int(personaID)))
	likesKey := fmt.Sprintf(personaActivityLikesKeyPattern, strconv.Itoa(int(personaID)))
	commentsKey := fmt.Sprintf(personaActivityCommentsKeyPattern, strconv.Itoa(int(personaID)))
	repliesKey := fmt.Sprintf(personaActivityRepliesKeyPattern, strconv.Itoa(int(personaID)))

	exists, err := s.client.Exists(ctx, postsKey, likesKey, commentsKey, repliesKey).Result()
	if err != nil {
		return fmt.Errorf("failed to check if persona activity sets exist: %w", err)
	}

	if exists == 0 {
		q := db.New(pg)
		personaActivities, err := q.GetPersonaActivities(ctx, int64(personaID))
		if err != nil {
			return fmt.Errorf("failed to get persona activities from postgres: %w", err)
		}
		cachedActivities := &PersonaActivity{}
		for _, activity := range personaActivities {
			cachedActivities.Comments = append(cachedActivities.Comments, activity.CommentTargets...)
			cachedActivities.Posts = append(cachedActivities.Posts, activity.PostTargets...)
			cachedActivities.Likes = append(cachedActivities.Likes, activity.LikeTargets...)
		}
		_ = s.SetPersonaActivities(ctx, personaID, cachedActivities)
	}
	return nil
}

func (s *PersonaStore) SetPersonaActivities(ctx context.Context, personaID int64, activities *PersonaActivity) error {
	if activities == nil {
		return fmt.Errorf("activities cannot be nil")
	}
	if activities.Posts != nil {
		s.client.SAdd(ctx, fmt.Sprintf(personaActivityPostsKeyPattern, strconv.Itoa(int(personaID))), activities.Posts)
	}
	if activities.Likes != nil {
		s.client.SAdd(ctx, fmt.Sprintf(personaActivityLikesKeyPattern, strconv.Itoa(int(personaID))), activities.Likes)
	}
	if activities.Comments != nil {
		s.client.SAdd(ctx, fmt.Sprintf(personaActivityCommentsKeyPattern, strconv.Itoa(int(personaID))), activities.Comments)
	}
	if activities.Replies != nil {
		s.client.SAdd(ctx, fmt.Sprintf(personaActivityRepliesKeyPattern, strconv.Itoa(int(personaID))), activities.Replies)
	}
	return nil
}

func (s *PersonaStore) AddToPersonaActivity(ctx context.Context, personaID int64, activityID string, activityType db.EventEnum) error {
	if bol, err := s.IsPersonaActivity(ctx, personaID, activityID, activityType); err != nil {
		return err
	} else if bol {
		return nil
	}
	switch activityType {
	case db.EventEnumPost:
		return s.client.SAdd(ctx, fmt.Sprintf(personaActivityPostsKeyPattern, strconv.Itoa(int(personaID))), activityID).Err()
	case db.EventEnumLike:
		return s.client.SAdd(ctx, fmt.Sprintf(personaActivityLikesKeyPattern, strconv.Itoa(int(personaID))), activityID).Err()
	case db.EventEnumComment:
		return s.client.SAdd(ctx, fmt.Sprintf(personaActivityCommentsKeyPattern, strconv.Itoa(int(personaID))), activityID).Err()
	default:
		return fmt.Errorf("invalid activity type: %s", activityType)
	}
}

func (s *PersonaStore) RemoveFromPersonaActivity(ctx context.Context, personaID int64, activityID string, activityType db.EventEnum) error {
	switch activityType {
	case db.EventEnumPost:
		return s.client.SRem(ctx, fmt.Sprintf(personaActivityPostsKeyPattern, strconv.Itoa(int(personaID))), activityID).Err()
	case db.EventEnumLike:
		return s.client.SRem(ctx, fmt.Sprintf(personaActivityLikesKeyPattern, strconv.Itoa(int(personaID))), activityID).Err()
	case db.EventEnumComment:
		return s.client.SRem(ctx, fmt.Sprintf(personaActivityCommentsKeyPattern, strconv.Itoa(int(personaID))), activityID).Err()
	default:
		return fmt.Errorf("invalid activity type: %s", activityType)
	}
}

func (s *PersonaStore) IsPersonaActivity(ctx context.Context, personaID int64, activityID string, activityType db.EventEnum) (bool, error) {
	var isMember bool
	var err error
	switch activityType {
	case db.EventEnumPost:
		isMember, err = s.client.SIsMember(ctx, fmt.Sprintf(personaActivityPostsKeyPattern, strconv.Itoa(int(personaID))), activityID).Result()
	case db.EventEnumLike:
		isMember, err = s.client.SIsMember(ctx, fmt.Sprintf(personaActivityLikesKeyPattern, strconv.Itoa(int(personaID))), activityID).Result()
	case db.EventEnumComment:
		isMember, err = s.client.SIsMember(ctx, fmt.Sprintf(personaActivityCommentsKeyPattern, strconv.Itoa(int(personaID))), activityID).Result()
	default:
		return false, fmt.Errorf("invalid activity type: %s", activityType)
	}
	if err != nil {
		return false, fmt.Errorf("failed to check if persona %s activity: %w", activityType, err)
	}
	return isMember, nil
}

// TODO: Add methods to remove/add specific activities if needed

func (s *PersonaStore) DeletePersonaActivities(ctx context.Context, personaID int32) error {
	s.client.Del(ctx, fmt.Sprintf(personaActivityPostsKeyPattern, strconv.Itoa(int(personaID))))
	s.client.Del(ctx, fmt.Sprintf(personaActivityLikesKeyPattern, strconv.Itoa(int(personaID))))
	s.client.Del(ctx, fmt.Sprintf(personaActivityCommentsKeyPattern, strconv.Itoa(int(personaID))))
	s.client.Del(ctx, fmt.Sprintf(personaActivityRepliesKeyPattern, strconv.Itoa(int(personaID))))
	return nil
}
