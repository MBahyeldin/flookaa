package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"redis_worker/internal"
	"redis_worker/internal/config"
	"shared/external/db/nats"
	"shared/external/db/redis"
	"time"
)

func main() {
	fmt.Println("Starting application...")
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, os.Interrupt)

	natsHelper, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		log.Fatal(err)
	}
	defer natsHelper.Close()
	natsHelper.EnsureStreams(ctx)

	redisClient, err := redis.Connect(ctx, cfg.RedisAddr, cfg.RedisPassword)
	if err != nil {
		log.Fatal(err)
	}
	stores := redis.NewStores(redisClient, 30*time.Minute)
	defer stores.Close()

	// run the internal processes
	internal.NewWorker(natsHelper, stores.Content, stores.Persona).Run(ctx)

	// Wait for interrupt signal
	<-sigc
	fmt.Println("Shutting down gracefully...")
	cancel()

	fmt.Println("Application stopped.")
}
