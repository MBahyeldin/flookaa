package redis

import (
	"time"

	"github.com/redis/go-redis/v9"
)

type SessionStore struct {
	client *redis.Client
	ttl    time.Duration
}

func newSessionStore(client *redis.Client, ttl time.Duration) *SessionStore {
	return &SessionStore{
		client: client,
		ttl:    ttl,
	}
}
