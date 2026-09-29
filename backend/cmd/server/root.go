package server

import (
	"app/cmd/server/api"
	v1 "app/cmd/server/api/v1"
	"app/cmd/server/control"
	"app/cmd/server/graphql"
	"app/internal/auth"
	"app/internal/config"
	"app/internal/db/postgres/handlers/channels"
	"app/internal/db/postgres/handlers/geo"
	"app/internal/db/postgres/handlers/users"
	controlhandlers "app/internal/db/redis/handler"
	"app/internal/oauthproviders"
	"app/util/email"
	"app/util/image"
	"app/util/verification"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"shared/external/db/mongo"
	"shared/external/db/nats"
	"shared/external/db/postgres"
	"shared/external/db/redis"
	"shared/pkg/db"
	resolvers "shared/pkg/graph/resolvers"
	"shared/util/token"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func StartServer(cfg config.Server) error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	signer, err := token.NewSigner(cfg.JWTSecret)
	if err != nil {
		return fmt.Errorf("JWT_SECRET_KEY: %w", err)
	}

	pg, err := postgres.Connect(ctx, cfg.DatabaseDSN)
	if err != nil {
		return err
	}
	defer pg.Close()

	mongoClient, err := mongo.Connect(ctx, cfg.MongoDSN)
	if err != nil {
		return err
	}
	defer mongoClient.Disconnect(context.Background())
	objects := mongo.Objects(mongoClient)
	if err := mongo.EnsureObjectIndexes(ctx, objects); err != nil {
		return err
	}

	natsHelper, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		return err
	}
	defer natsHelper.Close()
	// The backend owns stream creation and retention; other services only check.
	if err := natsHelper.EnsureStreams(ctx); err != nil {
		return err
	}

	redisClient, err := redis.Connect(ctx, cfg.RedisAddr, cfg.RedisPassword)
	if err != nil {
		return err
	}
	stores := redis.NewStores(redisClient, 30*time.Minute)
	defer stores.Close()

	// Neo4j is not wired for the first version of the app (see shared/external/db/neo).

	q := db.New(pg)

	usersHandler := users.NewHandler(
		q,
		signer,
		email.NewSender(email.Config(cfg.SMTP)),
		verification.NewService(q),
	)
	restHandlers := v1.Handlers{
		Users:    usersHandler,
		Channels: channels.NewHandler(q, natsHelper),
		Geo:      geo.NewHandler(q),
		Google: oauthproviders.NewGoogle(
			cfg.Google.ClientID,
			cfg.Google.ClientSecret,
			q,
			usersHandler,
			image.NewClient(cfg.S3BaseURL, signer),
		),
	}
	resolver := &resolvers.Resolver{
		Queries: q,
		Objects: objects,
		NATS:    natsHelper,
		Content: stores.Content,
		Persona: stores.Persona,
	}

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

	r.Use(auth.Middleware(signer))

	api.AddApiGroup(r, restHandlers)
	graphql.AddGraphQLGroup(r, resolver)
	control.AddControlGroup(r, controlhandlers.NewHandler(stores.Channel, q))

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
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	log.Println("Server exiting")
	return nil
}
