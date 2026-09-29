package mongo

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
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

// EnsureObjectIndexes creates the app.objects indexes. The unique index on
// id turns an id collision into an insert error instead of two documents
// sharing likes, counts and replies. It fails if duplicate ids already exist.
func EnsureObjectIndexes(ctx context.Context, objects *mongo.Collection) error {
	_, err := objects.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "id", Value: 1}},
			Options: options.Index().SetName("id_unique").SetUnique(true),
		},
		{
			// getPosts and getTotalPostsCountForChannel
			Keys: bson.D{
				{Key: "owner.id", Value: 1},
				{Key: "owner.type", Value: 1},
				{Key: "type", Value: 1},
				{Key: "createdat", Value: -1},
			},
			Options: options.Index().SetName("owner_type_createdat"),
		},
		{
			// getComments
			Keys: bson.D{
				{Key: "parentid", Value: 1},
				{Key: "type", Value: 1},
				{Key: "createdat", Value: 1},
			},
			Options: options.Index().SetName("parent_type_createdat"),
		},
	})
	if err != nil {
		return fmt.Errorf("mongo: ensure app.objects indexes: %w", err)
	}
	return nil
}
