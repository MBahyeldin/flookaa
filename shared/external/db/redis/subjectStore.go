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
	"slices"
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

var defaultSubjectEvents = []string{
	"direct_messages",
	"notifications",
	"alerts",
	string(nats.EventSaved),
}

// EnsureDefaultSubjects adds the default subjects the persona's stored list
// lacks, so a new default reaches existing personas too, and returns the list.
func (c *SubjectStore) EnsureDefaultSubjects(ctx context.Context, personaID string) (*[]types.SubjectOffsets, error) {
	personaIdInt, err := strconv.ParseInt(personaID, 10, 64)
	if err != nil {
		return nil, err
	}
	stored, err := c.ListSubjectsForPersona(ctx, personaID)
	if err != nil {
		return nil, err
	}
	subjects := *stored
	streamName := nats.USER_EVENTS_STREAM
	owner := &models.Owner{ID: personaIdInt, Type: models.OwnerTypePersona}
	for _, event := range defaultSubjectEvents {
		name := subject.New(&streamName, owner, event, "*").GetSubject()
		if slices.ContainsFunc(subjects, func(s types.SubjectOffsets) bool { return s.Subject == name }) {
			continue
		}
		if _, err := c.AddSubjectToPersona(ctx, personaID, name, 0); err != nil {
			return nil, err
		}
		subjects = append(subjects, types.SubjectOffsets{Subject: name})
	}
	return &subjects, nil
}

// AddSubjectToPersona creates a new subject for the persona with initial offsets
func (c *SubjectStore) AddSubjectToPersona(ctx context.Context, personaID string, subject string, offset int) (*types.SubjectOffsets, error) {
	key := getSubjectsKey(personaID)

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

// RemoveSubjectFromPersona deletes the subject for the persona
func (c *SubjectStore) RemoveSubjectFromPersona(ctx context.Context, personaID string, subject string) (*[]string, error) {
	key := getSubjectsKey(personaID)

	err := c.client.LRem(ctx, key, 0, subject).Err()
	if err != nil {
		return nil, err
	}

	return &[]string{key}, nil
}

// ListSubjectsForPersona returns all subjects the persona is subscribed to
func (c *SubjectStore) ListSubjectsForPersona(ctx context.Context, personaID string) (*[]types.SubjectOffsets, error) {
	key := getSubjectsKey(personaID)

	// Get all elements in the list
	vals, err := c.client.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to list subjects: %w", err)
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

// Subject lists are keyed by persona. The old user:<id>:subjects keys are
// no longer read.
func getSubjectsKey(personaID string) string {
	return fmt.Sprintf("persona:%s:subjects", personaID)
}
