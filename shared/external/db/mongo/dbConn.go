package mongo

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client

func init() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	log.Println("Connecting to MongoDB...")

	uri := os.Getenv("MONGODB_DSN")
	if uri == "" {
		fmt.Println("No connection string provided - set MONGODB_DSN")
		os.Exit(1)
	}
	uri = strings.TrimSuffix(uri, "?ssl=false")

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Could not connect Mongo:", err)
	}

	Client = client
}

func Collection(name string) *mongo.Collection {
	return Client.Database("socialapp").Collection(name)
}
