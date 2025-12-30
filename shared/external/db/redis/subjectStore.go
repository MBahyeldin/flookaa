package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"shared/external/db/nats"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"shared/pkg/types"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type SubjectStore struct {
	client *redis.Client
	ttl    time.Duration
}

func newSubjectStore(client *redis.Client, ttl time.Duration) *SubjectStore {
	return &SubjectStore{
		client: client,
		ttl:    ttl,
	}
}

// add default subjects for a new user
func (c *SubjectStore) AddDefaultSubjectsToUser(ctx context.Context, userID string) (*[]types.SubjectOffsets, error) {
	var StreamName = nats.USER_EVENTS_STREAM
	events := []string{
		"direct_messages",
		"notifications",
		"alerts",
	}
	var subjectOffsets []types.SubjectOffsets

	userIdInt, err := strconv.Atoi(userID)
	if err != nil {
		return nil, err
	}

	for _, event := range events {
		subjectHelper := subject.New(&StreamName, &models.Owner{
			ID:   int64(userIdInt),
			Type: models.OwnerTypePersona,
		}, event, "*")
		subject := subjectHelper.GetSubject()
		if result, err := c.AddSubjectToUser(ctx, userID, subject, 0); err != nil {
			return nil, err
		} else {
			subjectOffsets = append(subjectOffsets, *result)
		}
	}
	return &subjectOffsets, nil
}

// AddSubject creates a new subject for the user with initial offsets
func (c *SubjectStore) AddSubjectToUser(ctx context.Context, userId string, subject string, offset int) (*types.SubjectOffsets, error) {
	key := getSubjectsKey(userId)

	data := types.SubjectOffsets{
		Subject: subject,
		Offset:  offset,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	if err := c.client.RPush(ctx, key, jsonData).Err(); err != nil {
		return nil, err
	}

	return &types.SubjectOffsets{
		Subject: key,
		Offset:  offset,
	}, nil
}

// RemoveSubject deletes the subject hash for the user
func (c *SubjectStore) RemoveSubjectFromUser(ctx context.Context, userId string, subject string) (*[]string, error) {
	key := getSubjectsKey(userId)

	err := c.client.LRem(ctx, key, 0, subject).Err()
	if err != nil {
		return nil, err
	}

	return &[]string{key}, nil
}

// ListSubjects returns all subjects the user is subscribed to
func (c *SubjectStore) ListSubjectsForUser(ctx context.Context, userID string) (*[]types.SubjectOffsets, error) {
	key := getSubjectsKey(userID)

	// Get all elements in the list
	vals, err := c.client.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		log.Fatal(err)
	}

	var subjects []types.SubjectOffsets
	for _, v := range vals {
		var item map[string]interface{}
		if err := json.Unmarshal([]byte(v), &item); err != nil {
			log.Println("Failed to parse item:", err)
			continue
		}

		offset := int(item["offset"].(float64))
		// JSON numbers are float64
		subjects = append(subjects, types.SubjectOffsets{
			Subject: item["subject"].(string),
			Offset:  offset,
		})
	}

	return &subjects, nil
}

func getSubjectsKey(userId string) string {
	return fmt.Sprintf("user:%s:subjects", userId)
}
