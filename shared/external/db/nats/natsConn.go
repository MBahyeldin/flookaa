package nats

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"shared/pkg/db"
	"slices"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const USER_EVENTS_STREAM = "STREAM_USER_EVENTS"
const CONTENT_EVENTS_STREAM = "STREAM_CONTENT_EVENTS"

var DefaultStreamNames = []string{USER_EVENTS_STREAM, CONTENT_EVENTS_STREAM}

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

type NatsInterface interface {
	AddSubjectToStream(streamName, subject string) (*jetstream.Stream, error)
	RemoveSubjectFromStream(streamName, subject string) error
	PublishMessage(subject string, message db.CreateEventParams) error
}

var NatsHelperInstance NatsHelper

func init() {
	ctx := context.Background()
	// Connect to NATS server
	nc, err := nats.Connect(os.Getenv("NATS_CONNECTION"))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Connected to NATS!")

	// create default stream if not exist
	js, err := jetstream.New(nc)
	if err != nil {
		fmt.Println("cannot connect to jet stream")
	}
	NatsHelperInstance = NatsHelper{
		Conn:      nc,
		JetStream: js,
	}
	createDefaultStreams(ctx)
}

func createDefaultStreams(ctx context.Context) {
	js := NatsHelperInstance.JetStream

	// get or create default streams
	streams := js.ListStreams(ctx)
	for s := range streams.Info() {
		fmt.Println(s.Config.Name)
	}

	if streams.Err() != nil {
		fmt.Println("Unexpected error occurred while listing streams")
	}

	// list stream names
	names := js.StreamNames(ctx)
	if names.Err() != nil {
		fmt.Println("Unexpected error occurred while listing stream names")
	}
	currentNames := []string{}
	for name := range names.Name() {
		currentNames = append(currentNames, name)
	}

	for _, streamName := range DefaultStreamNames {
		if slices.Contains(currentNames, streamName) {
			fmt.Printf("Stream %s already exists\n", streamName)
			continue
		}
		// list stream names

		_, err := js.CreateStream(ctx, jetstream.StreamConfig{
			Name:     streamName,
			Subjects: []string{},
			Storage:  jetstream.FileStorage,
			Replicas: 1,
		})
		if err != nil {
			fmt.Printf("Error creating stream %s: %v\n", streamName, err)
		} else {
			fmt.Printf("Stream %s created successfully\n", streamName)
		}
		NatsHelperInstance.AddSubjectToStream(ctx, streamName, fmt.Sprintf("%s.>", streamName))
	}
}

func (natsHelper *NatsHelper) AddSubjectToStream(ctx context.Context, streamName, subject string) (*jetstream.Stream, error) {
	streams := natsHelper.JetStream.ListStreams(ctx)
	subjectExists := false
	currentStreamSubjects := []string{}
	for s := range streams.Info() {
		if s.Config.Name != streamName {
			continue
		}
		if slices.Contains(s.Config.Subjects, subject) {
			subjectExists = true
			break
		}
		currentStreamSubjects = s.Config.Subjects
	}

	if subjectExists {
		fmt.Printf("Subject %s already exists in a stream\n", subject)
		return nil, nil
	}

	stream, err := natsHelper.JetStream.UpdateStream(ctx, jetstream.StreamConfig{
		Name:     streamName,
		Subjects: append(currentStreamSubjects, subject),
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	if err != nil {
		fmt.Printf("Error adding subject %s to stream %s: %v\n", subject, streamName, err)
		return nil, err
	}
	fmt.Printf("Subject %s added to stream %s successfully\n", subject, streamName)
	return &stream, nil
}

func (natsHelper *NatsHelper) RemoveSubjectFromStream(ctx context.Context, streamName, subject string) error {
	streams := natsHelper.JetStream.ListStreams(ctx)
	currentStreamSubjects := []string{}
	for s := range streams.Info() {
		if s.Config.Name != streamName {
			continue
		}
		if !slices.Contains(s.Config.Subjects, subject) {
			fmt.Printf("Subject %s does not exist in stream %s\n", subject, streamName)
			return nil
		}
		currentStreamSubjects = s.Config.Subjects
	}

	// remove subject from current subjects
	newSubjects := []string{}
	for _, sub := range currentStreamSubjects {
		if sub != subject {
			newSubjects = append(newSubjects, sub)
		}
	}

	_, err := natsHelper.JetStream.UpdateStream(ctx, jetstream.StreamConfig{
		Name:     streamName,
		Subjects: newSubjects,
		Storage:  jetstream.FileStorage,
		Replicas: 1,
	})
	if err != nil {
		fmt.Printf("Error removing subject %s from stream %s: %v\n", subject, streamName, err)
		return err
	}
	fmt.Printf("Subject %s removed from stream %s successfully\n", subject, streamName)
	return nil
}

func (natsHelper *NatsHelper) PublishMessage(subject string, message *MessageType) error {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("Error marshalling message for subject %s: %v\n", subject, err)
		return err
	}
	err = NatsHelperInstance.Conn.Publish(subject, messageBytes)
	if err != nil {
		fmt.Printf("Error publishing message to subject %s: %v\n", subject, err)
		return err
	}
	return nil
}

func (natsHelper *NatsHelper) SubscribeToSubject(ctx context.Context, subject string, handler nats.MsgHandler) (*nats.Subscription, error) {
	subscription, err := natsHelper.Conn.Subscribe(subject, handler)
	if err != nil {
		fmt.Printf("Error subscribing to subject %s: %v\n", subject, err)
		return nil, err
	}
	fmt.Printf("Subscribed to subject %s successfully\n", subject)
	return subscription, nil
}

func (natsHelper *NatsHelper) QueueSubscribeToSubject(ctx context.Context, subject, queue string, handler nats.MsgHandler) (*nats.Subscription, error) {
	subscription, err := natsHelper.Conn.QueueSubscribe(subject, queue, handler)
	if err != nil {
		fmt.Printf("Error queue subscribing to subject %s: %v\n", subject, err)
		return nil, err
	}
	fmt.Printf("Queue subscribed to subject %s successfully\n", subject)
	return subscription, nil
}

func (natsHelper *NatsHelper) DrainSubscription(ctx context.Context, sub *nats.Subscription) error {
	err := sub.Drain()
	if err != nil {
		fmt.Printf("Error draining subscription: %v\n", err)
		return err
	}
	fmt.Println("Subscription drained successfully")
	return nil
}
