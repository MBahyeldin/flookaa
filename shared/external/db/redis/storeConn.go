package redis

import (
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var redisClient *redis.Client

var Store *RedisStores

func init() {
	redisClient = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})
	Store = newStore(30 * time.Minute)
}

// Store struct for Redis
type RedisStores struct {
	User    *UserStore
	Session *SessionStore
	Channel *SubjectStore
	Content *ContentStore
}

// NewStore creates a new Redis store
func newStore(ttl time.Duration) *RedisStores {
	return &RedisStores{
		User:    newUserStore(redisClient, ttl),
		Session: newSessionStore(redisClient, ttl),
		Channel: newSubjectStore(redisClient, ttl),
		Content: newContentStore(redisClient, ttl),
	}
}

func (s *RedisStores) Close() error {
	return s.User.client.Close()
}
