package main

import (
	"context"
	"fmt"
	"log"
	"notifier/internal"
	"notifier/internal/config"
	"os"
	"os/signal"
	"shared/external/db/nats"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"shared/pkg/notifications"
	"syscall"
)

func main() {
	fmt.Println("Starting notifier...")
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sigc := make(chan os.Signal, 1)
	// systemd stops the service with SIGTERM.
	signal.Notify(sigc, os.Interrupt, syscall.SIGTERM)

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

	q := db.New(pg)
	if err := notifications.Check(ctx, q); err != nil {
		log.Fatal(err)
	}

	consumeCtxs, err := internal.NewWorker(natsHelper, q).Run(ctx)
	if err != nil {
		log.Fatal(err)
	}

	<-sigc
	fmt.Println("Shutting down gracefully...")
	for _, c := range consumeCtxs {
		c.Stop()
	}

	fmt.Println("Notifier stopped.")
}
