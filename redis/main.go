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
	"shared/external/db/postgres"
	"shared/external/db/redis"
	"shared/pkg/db"
	"time"
)

func main() {
	fmt.Println("Starting application...")
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, os.Interrupt)

	pg, err := postgres.Connect(ctx, cfg.DatabaseDSN)
	if err != nil {
		log.Fatal(err)
	}
	defer pg.Close()

	natsHelper, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		log.Fatal(err)
	}
	defer natsHelper.Close()

	redisClient, err := redis.Connect(ctx, cfg.RedisAddr, cfg.RedisPassword)
	if err != nil {
		log.Fatal(err)
	}
	stores := redis.NewStores(redisClient, 30*time.Minute)
	defer stores.Close()

	consumeCtx, err := internal.NewWorker(natsHelper, stores.Content, db.New(pg)).Run(ctx)
	if err != nil {
		log.Fatal(err)
	}

	// Wait for interrupt signal
	<-sigc
	fmt.Println("Shutting down gracefully...")
	consumeCtx.Stop()

	fmt.Println("Application stopped.")
}
