package graphql

import (
	"context"
	"shared/external/db/mongo"
	"shared/external/db/neo"
	"shared/external/db/postgres"
	"shared/pkg/graph"
	models "shared/pkg/graph/resolvers"
	"shared/util/keys"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
)

func AddGraphQLGroup(r *gin.Engine) {
	// --- GraphQL server ---
	resolver := &models.Resolver{
		Postgres: postgres.DbConn,
		Mongo:    mongo.Client,
		Neo4j:    neo.Neo4jDriver,
	}

	srv := handler.NewDefaultServer(
		models.NewExecutableSchema(
			graph.Config{
				Resolvers: resolver,
			},
		),
	)

	r.POST("/query", func(c *gin.Context) {
		ctx := context.WithValue(c.Request.Context(), keys.GinContextKey, c)
		c.Request = c.Request.WithContext(ctx)
		srv.ServeHTTP(c.Writer, c.Request)
	})

	r.GET("/playground", func(c *gin.Context) {
		playground.Handler("GraphQL playground", "/query").ServeHTTP(c.Writer, c.Request)
	})
}
