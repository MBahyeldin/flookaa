package server

import (
	"app/cmd/server/api"
	"app/cmd/server/control"
	"app/cmd/server/graphql"
	"app/internal/middlewares"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"shared/external/db/mongo"
	"shared/external/db/nats"
	"shared/external/db/neo"
	"shared/external/db/postgres"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func StartServer() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	defer postgres.DbConn.Close()
	defer mongo.Client.Disconnect(ctx)
	defer nats.NatsHelperInstance.Conn.Close()
	defer neo.Neo4jDriver.Close(ctx)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	r := gin.Default()

	// TODO: REMOVE LOCALHOST BEFORE DEPLOYMENT
	r.Use(cors.New(cors.Config{
		AllowOrigins:  []string{"https://flookaa.com", "https://www.flookaa.com", "http://localhost:5173"},
		AllowMethods:  []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		ExposeHeaders: []string{"Content-Length"},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Authorization",
			"Priority",
			"Accept",
			"Accept-Language",
		},
		AllowCredentials: true,
	}))

	r.Use(middlewares.AuthMiddleware())

	api.AddApiGroup(r)
	graphql.AddGraphQLGroup(r)
	control.AddControlGroup(r)

	server := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		serverErr := server.ListenAndServe()
		if serverErr != nil && serverErr != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", serverErr)
		}
	}()

	select {

	case <-sig:
		log.Println("Received interrupt signal, shutting down...")
	case <-ctx.Done():
		log.Println("Context cancelled, shutting down...")
	}

	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")

}
