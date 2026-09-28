package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/external/db/redis"
	"shared/pkg/db"

	"github.com/nats-io/nats.go"
)

type Worker struct {
	nats    *shared_nats.NatsHelper
	content *redis.ContentStore
	persona *redis.PersonaStore
}

func NewWorker(nats *shared_nats.NatsHelper, content *redis.ContentStore, persona *redis.PersonaStore) *Worker {
	return &Worker{nats: nats, content: content, persona: persona}
}

func (w *Worker) Run(ctx context.Context) {
	w.nats.SubscribeToSubject(ctx, fmt.Sprintf("%s.>", shared_nats.CONTENT_EVENTS_STREAM), func(msg *nats.Msg) {
		var message shared_nats.MessageType
		err := json.Unmarshal(msg.Data, &message)
		if err != nil {
			fmt.Println("Error unmarshaling message:", err)
			return
		}

		switch message.Event.Name {
		case db.EventEnumComment:
			switch message.Event.TargetType {
			case db.EventTargetTypeEnumPOST:
				w.handleCommentEventOnPost(ctx, message.Event)
			case db.EventTargetTypeEnumCOMMENT:
				w.handleCommentEventOnComment(ctx, message.Event)
			default:
				log.Println("Unknown target type for comment event:", message.Event.TargetType)
			}
		case db.EventEnumLike:
			w.handleLikeEvent(ctx, message.Event)
		case db.EventEnumPost:
			w.handlePostEvent(ctx, message.Event)
		default:
			fmt.Println("Unknown event type:", message.Event)
		}
	})

}
