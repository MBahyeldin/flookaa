package nats

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"shared/pkg/db"
	"slices"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const USER_EVENTS_STREAM = "STREAM_USER_EVENTS"
const CONTENT_EVENTS_STREAM = "STREAM_CONTENT_EVENTS"
const CHANNEL_EVENTS_STREAM = "STREAM_CHANNEL_EVENTS"

var DefaultStreamNames = []string{USER_EVENTS_STREAM, CONTENT_EVENTS_STREAM, CHANNEL_EVENTS_STREAM}

// StreamMaxAge bounds stream growth. It is also how far back the websocket
// proxy can replay for a reconnecting browser.
const StreamMaxAge = 7 * 24 * time.Hour

type Event struct {
	Name       db.EventEnum           `json:"name"`
	Action     db.EventActionEnum     `json:"action"`
	TargetId   string                 `json:"target_id"`
	TargetType db.EventTargetTypeEnum `json:"target_type"`
	Owner      db.OwnerEnum           `json:"owner"`
	OwnerID    int64                  `json:"owner_id"`
	ActorID    int64                  `json:"actor_id"`
	Timestamp  int64                  `json:"timestamp"`
}

type MessageType struct {
	Event   Event       `json:"event"`
	Payload interface{} `json:"payload,omitempty"`
}

type NatsHelper struct {
	Conn      *nats.Conn
	JetStream jetstream.JetStream
}

// Connect opens a NATS connection and a JetStream context on top of it.
func Connect(url string) (*NatsHelper, error) {
	nc, err := nats.Connect(url)
	if err != nil {
		return nil, fmt.Errorf("nats: connect: %w", err)
	}
	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("nats: jetstream: %w", err)
	}
	return &NatsHelper{Conn: nc, JetStream: js}, nil
}

func (natsHelper *NatsHelper) Close() {
	natsHelper.Conn.Close()
}

// EnsureStreams creates the default streams, or updates existing ones so they
// capture "<stream>.>" and expire messages after StreamMaxAge. Only the
// backend calls this; other services use CheckStream.
func (natsHelper *NatsHelper) EnsureStreams(ctx context.Context) error {
	for _, name := range DefaultStreamNames {
		subject := name + ".>"

		stream, err := natsHelper.JetStream.Stream(ctx, name)
		if errors.Is(err, jetstream.ErrStreamNotFound) {
			_, err = natsHelper.JetStream.CreateStream(ctx, jetstream.StreamConfig{
				Name:     name,
				Subjects: []string{subject},
				Storage:  jetstream.FileStorage,
				Replicas: 1,
				MaxAge:   StreamMaxAge,
			})
			if err != nil {
				return fmt.Errorf("nats: create stream %s: %w", name, err)
			}
			log.Printf("nats: created stream %s", name)
			continue
		}
		if err != nil {
			return fmt.Errorf("nats: get stream %s: %w", name, err)
		}

		// Start from the live config so updates keep every other setting.
		cfg := stream.CachedInfo().Config
		if cfg.MaxAge == StreamMaxAge && slices.Contains(cfg.Subjects, subject) {
			continue
		}
		cfg.MaxAge = StreamMaxAge
		if !slices.Contains(cfg.Subjects, subject) {
			cfg.Subjects = append(cfg.Subjects, subject)
		}
		if _, err := natsHelper.JetStream.UpdateStream(ctx, cfg); err != nil {
			return fmt.Errorf("nats: update stream %s: %w", name, err)
		}
		log.Printf("nats: updated stream %s (max age %s)", name, StreamMaxAge)
	}
	return nil
}

// CheckStream fails when a stream the caller depends on does not exist.
func (natsHelper *NatsHelper) CheckStream(ctx context.Context, name string) error {
	if _, err := natsHelper.JetStream.Stream(ctx, name); err != nil {
		return fmt.Errorf("nats: stream %s is not available (the backend creates it on startup): %w", name, err)
	}
	return nil
}

// PublishMessage publishes to JetStream and waits for the stream to store the
// message, so a missing stream or a full disk surfaces as an error instead of
// a silently dropped event.
func (natsHelper *NatsHelper) PublishMessage(ctx context.Context, subject string, message *MessageType) error {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("nats: marshal message for %s: %w", subject, err)
	}
	if _, err := natsHelper.JetStream.Publish(ctx, subject, messageBytes); err != nil {
		return fmt.Errorf("nats: publish to %s: %w", subject, err)
	}
	return nil
}
