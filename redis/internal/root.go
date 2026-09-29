package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/external/db/redis"
	"shared/pkg/counters"
	"shared/pkg/db"
	"time"

	"github.com/nats-io/nats.go/jetstream"
)

// consumerName is the durable JetStream consumer. Being durable, it resumes
// where it left off after a restart instead of missing events.
const consumerName = "redis-counters"

// retryDelays are the NAK delays for the 1st, 2nd, 3rd+ failed delivery.
// After MaxDeliver attempts the event is dropped; the next event on the same
// target, or the cache TTL, still corrects the count.
var retryDelays = []time.Duration{time.Second, 5 * time.Second, 30 * time.Second}

const maxDeliver = 5

// Worker keeps the Redis counter cache in step with Postgres.
//
// It never increments: for each like/comment event it recounts the target
// from Postgres events and overwrites the cached hash. Replayed, duplicated
// or out-of-order events therefore converge to the right value.
type Worker struct {
	nats    *shared_nats.NatsHelper
	content *redis.ContentStore
	q       *db.Queries
}

func NewWorker(nats *shared_nats.NatsHelper, content *redis.ContentStore, q *db.Queries) *Worker {
	return &Worker{nats: nats, content: content, q: q}
}

// Run attaches the durable consumer and starts processing. Stop the returned
// ConsumeContext on shutdown.
func (w *Worker) Run(ctx context.Context) (jetstream.ConsumeContext, error) {
	if err := w.nats.CheckStream(ctx, shared_nats.CONTENT_EVENTS_STREAM); err != nil {
		return nil, err
	}

	consumer, err := w.nats.JetStream.CreateOrUpdateConsumer(ctx, shared_nats.CONTENT_EVENTS_STREAM, jetstream.ConsumerConfig{
		Durable:       consumerName,
		FilterSubject: shared_nats.CONTENT_EVENTS_STREAM + ".>",
		AckPolicy:     jetstream.AckExplicitPolicy,
		// On first creation start from now: the recount makes history replay
		// unnecessary. Afterwards the durable position is kept.
		DeliverPolicy: jetstream.DeliverNewPolicy,
		AckWait:       30 * time.Second,
		MaxDeliver:    maxDeliver,
	})
	if err != nil {
		return nil, fmt.Errorf("create consumer %s: %w", consumerName, err)
	}

	consumeCtx, err := consumer.Consume(func(msg jetstream.Msg) { w.handle(ctx, msg) })
	if err != nil {
		return nil, fmt.Errorf("consume %s: %w", consumerName, err)
	}
	log.Printf("redis worker: consuming %s as %s", shared_nats.CONTENT_EVENTS_STREAM, consumerName)
	return consumeCtx, nil
}

func (w *Worker) handle(ctx context.Context, msg jetstream.Msg) {
	var message shared_nats.MessageType
	if err := json.Unmarshal(msg.Data(), &message); err != nil {
		// Redelivering can't fix a malformed payload.
		log.Printf("redis worker: dropping unparseable message on %s: %v", msg.Subject(), err)
		_ = msg.Term()
		return
	}

	msgCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := w.process(msgCtx, message.Event); err != nil {
		delay := retryDelays[len(retryDelays)-1]
		if md, mdErr := msg.Metadata(); mdErr == nil && int(md.NumDelivered) <= len(retryDelays) {
			delay = retryDelays[md.NumDelivered-1]
		}
		log.Printf("redis worker: %s %s on %s failed, retrying in %s: %v",
			message.Event.Name, message.Event.Action, message.Event.TargetId, delay, err)
		_ = msg.NakWithDelay(delay)
		return
	}
	_ = msg.Ack()
}

// process recounts the event's target and overwrites its cached counters.
func (w *Worker) process(ctx context.Context, event shared_nats.Event) error {
	switch event.Name {
	case db.EventEnumLike, db.EventEnumComment:
	default:
		// Post events carry no counters.
		return nil
	}

	meta, err := counters.Count(ctx, w.q, event.TargetId)
	if err != nil {
		return err
	}

	switch event.TargetType {
	case db.EventTargetTypeEnumPOST:
		return w.content.SetPostMeta(ctx, event.TargetId, meta)
	case db.EventTargetTypeEnumCOMMENT:
		return w.content.SetCommentMeta(ctx, event.TargetId, meta)
	default:
		log.Printf("redis worker: ignoring %s event with target type %q", event.Name, event.TargetType)
		return nil
	}
}
