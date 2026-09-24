package server

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"whatsapp/cmd/server/api"
	"whatsapp/internal/config"
	"whatsapp/internal/whatsapp"

	"github.com/gin-gonic/gin"
)

func StartServer() {
	cfg := config.Load()

	// Root context is cancelled on SIGTERM so the pairing loop stops too.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	svc, err := whatsapp.New(ctx, cfg.SessionDBPath)
	if err != nil {
		log.Fatalf("Failed to initialise whatsapp client: %v", err)
	}

	// Connecting (or pairing) happens in the background. The HTTP server comes
	// up either way so /health and /api/v1/status stay reachable while the
	// account is unlinked — sends return 503 until it is.
	if err := svc.Start(ctx); err != nil {
		log.Printf("Failed to connect to whatsapp on startup, auto-reconnect will retry: %v", err)
	}

	r := gin.Default()

	// No CORS middleware on purpose: this service is internal-only and its
	// static bearer token must never be shipped to a browser.
	api.AddApiGroup(r, cfg, svc)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("whatsapp service listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down...")

	// Every deploy restarts this service, so close the WhatsApp socket cleanly
	// rather than letting it drop.
	svc.Stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP shutdown error: %v", err)
	}
}
