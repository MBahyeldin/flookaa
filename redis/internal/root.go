package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	shared_nats "shared/external/db/nats"
	"shared/pkg/db"

	"github.com/nats-io/nats.go"
)

func Run(ctx context.Context) {
	shared_nats.NatsHelperInstance.SubscribeToSubject(ctx, fmt.Sprintf("%s.>", shared_nats.CONTENT_EVENTS_STREAM), func(msg *nats.Msg) {
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
				handleCommentEventOnPost(ctx, message.Event)
			case db.EventTargetTypeEnumCOMMENT:
				handleCommentEventOnComment(ctx, message.Event)
			default:
				log.Println("Unknown target type for comment event:", message.Event.TargetType)
			}
		case db.EventEnumLike:
			handleLikeEvent(ctx, message.Event)
		case db.EventEnumPost:
			handlePostEvent(ctx, message.Event)
		default:
			fmt.Println("Unknown event type:", message.Event)
		}
	})

}
