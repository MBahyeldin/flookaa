package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Connect opens a Redis client and pings it.
func Connect(ctx context.Context, addr, password string) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx).Err(); err != nil {
		client.Close()
		return nil, fmt.Errorf("redis: ping: %w", err)
	}
	return client, nil
}

// RedisStores groups the typed stores that share one Redis client.
type RedisStores struct {
	client  *redis.Client
	Persona *PersonaStore
	Session *SessionStore
	Channel *SubjectStore
	Content *ContentStore
}

// NewStores builds every store on top of client.
func NewStores(client *redis.Client, ttl time.Duration) *RedisStores {
	return &RedisStores{
		client:  client,
		Persona: newPersonaStore(client, ttl),
		Session: newSessionStore(client, ttl),
		Channel: newSubjectStore(client, ttl),
		Content: newContentStore(client, ttl),
	}
}

func (s *RedisStores) Close() error {
	return s.client.Close()
}
