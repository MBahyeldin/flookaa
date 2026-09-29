package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/pkg/db"
	"time"

	"github.com/nats-io/nats.go/jetstream"
)

// retryDelays are the NAK delays for the 1st, 2nd, 3rd+ failed delivery.
// After maxDeliver attempts the event is dropped; the notification is then
// missing (or stale) until the next event on the same thing.
var retryDelays = []time.Duration{time.Second, 5 * time.Second, 30 * time.Second}

const maxDeliver = 5

// message is a published MessageType with the payload left raw, so each
// handler decodes the payload shape of its own events.
type message struct {
	Event   shared_nats.Event `json:"event"`
	Payload json.RawMessage   `json:"payload,omitempty"`
}

// handler processes one event. eventAt is when it happened; it orders
// updates to a notification, so replays and redeliveries change nothing.
type handler func(ctx context.Context, m message, eventAt time.Time) error

// Worker turns content and channel events into notifications.
//
// It never keeps running totals: rows are upserted per recipient and thing,
// and whether a thing still deserves a notification is recounted from
// Postgres. Replayed, duplicated or out-of-order events therefore converge.
type Worker struct {
	nats *shared_nats.NatsHelper
	q    *db.Queries
}

func NewWorker(nats *shared_nats.NatsHelper, q *db.Queries) *Worker {
	return &Worker{nats: nats, q: q}
}

// Run attaches one durable consumer per source stream (a consumer cannot
// span streams) and starts processing. Stop the returned ConsumeContexts on
// shutdown.
//
// A future source on STREAM_USER_EVENTS (friend or follow requests) must use
// specific FilterSubjects, never "STREAM_USER_EVENTS.>": the notifier
// publishes its own notifications.* frames there and must not consume them.
func (w *Worker) Run(ctx context.Context) ([]jetstream.ConsumeContext, error) {
	sources := []struct {
		stream  string
		durable string
		handle  handler
	}{
		{shared_nats.CONTENT_EVENTS_STREAM, "notifier-content", w.content},
		{shared_nats.CHANNEL_EVENTS_STREAM, "notifier-channel", w.channel},
	}

	var consumeCtxs []jetstream.ConsumeContext
	stopAll := func() {
		for _, c := range consumeCtxs {
			c.Stop()
		}
	}
	for _, s := range sources {
		c, err := w.consume(ctx, s.stream, s.durable, s.handle)
		if err != nil {
			stopAll()
			return nil, err
		}
		consumeCtxs = append(consumeCtxs, c)
	}
	return consumeCtxs, nil
}

func (w *Worker) consume(ctx context.Context, stream, durable string, handle handler) (jetstream.ConsumeContext, error) {
	if err := w.nats.CheckStream(ctx, stream); err != nil {
		return nil, err
	}

	consumer, err := w.nats.JetStream.CreateOrUpdateConsumer(ctx, stream, jetstream.ConsumerConfig{
		Durable:       durable,
		FilterSubject: stream + ".>",
		AckPolicy:     jetstream.AckExplicitPolicy,
		DeliverPolicy: jetstream.DeliverNewPolicy,
		AckWait:       30 * time.Second,
		MaxDeliver:    maxDeliver,
	})
	if err != nil {
		return nil, fmt.Errorf("create consumer %s: %w", durable, err)
	}

	consumeCtx, err := consumer.Consume(func(msg jetstream.Msg) { w.handle(ctx, msg, handle) })
	if err != nil {
		return nil, fmt.Errorf("consume %s: %w", durable, err)
	}
	log.Printf("notifier: consuming %s as %s", stream, durable)
	return consumeCtx, nil
}

func (w *Worker) handle(ctx context.Context, msg jetstream.Msg, handle handler) {
	var m message
	if err := json.Unmarshal(msg.Data(), &m); err != nil {
		// Redelivering can't fix a malformed payload.
		log.Printf("notifier: dropping unparseable message on %s: %v", msg.Subject(), err)
		_ = msg.Term()
		return
	}

	md, mdErr := msg.Metadata()

	eventAt := time.UnixMilli(m.Event.Timestamp)
	if m.Event.Timestamp == 0 && mdErr == nil {
		eventAt = md.Timestamp
	}

	msgCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := handle(msgCtx, m, eventAt); err != nil {
		delay := retryDelays[len(retryDelays)-1]
		if mdErr == nil && int(md.NumDelivered) <= len(retryDelays) {
			delay = retryDelays[md.NumDelivered-1]
		}
		log.Printf("notifier: %s %s on %s failed, retrying in %s: %v",
			m.Event.Name, m.Event.Action, m.Event.TargetId, delay, err)
		_ = msg.NakWithDelay(delay)
		return
	}
	_ = msg.Ack()
}
