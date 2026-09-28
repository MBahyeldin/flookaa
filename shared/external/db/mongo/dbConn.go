package mongo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Connect opens a Mongo client and pings it.
func Connect(ctx context.Context, uri string) (*mongo.Client, error) {
	connectCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	uri = strings.TrimSuffix(uri, "?ssl=false")

	client, err := mongo.Connect(connectCtx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("mongo: connect: %w", err)
	}

	if err := client.Ping(connectCtx, nil); err != nil {
		_ = client.Disconnect(ctx)
		return nil, fmt.Errorf("mongo: ping: %w", err)
	}
	return client, nil
}

// Objects returns the collection that holds posts, comments and replies.
func Objects(client *mongo.Client) *mongo.Collection {
	return client.Database("app").Collection("objects")
}
