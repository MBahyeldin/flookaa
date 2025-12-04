package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"redis_worker/internal"
	"shared/external/db/nats"
)

func main() {
	fmt.Println("Starting application...")
	ctx, cancel := context.WithCancel(context.Background())
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, os.Interrupt)

	defer nats.NatsHelperInstance.Conn.Close()

	// run the internal processes
	internal.Run(ctx)

	// Wait for interrupt signal
	<-sigc
	fmt.Println("Shutting down gracefully...")
	cancel()

	fmt.Println("Application stopped.")
}
