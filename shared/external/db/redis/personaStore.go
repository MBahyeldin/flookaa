package redis

import (
	"context"
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

func newPersonaStore(client *redis.Client, ttl time.Duration) *PersonaStore {
	return &PersonaStore{
		client: client,
		ttl:    ttl,
	}
}

const personaInfoKeyPattern = "persona:%s:info"

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
