package graphql

import (
	"app/internal/auth"
	"context"
	"shared/pkg/graph"
	models "shared/pkg/graph/resolvers"
	"shared/util/keys"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"
)

func AddGraphQLGroup(r *gin.Engine, resolver *models.Resolver) {
	// --- GraphQL server ---
	srv := handler.NewDefaultServer(
		models.NewExecutableSchema(
			graph.Config{
				Resolvers: resolver,
			},
		),
	)

	r.POST("/query", auth.RequirePersona(), func(c *gin.Context) {
		ctx := context.WithValue(c.Request.Context(), keys.GinContextKey, c)
		c.Request = c.Request.WithContext(ctx)
		srv.ServeHTTP(c.Writer, c.Request)
	})

	// The playground is a dev tool; production runs with GIN_MODE=release.
	if gin.Mode() != gin.ReleaseMode {
		r.GET("/playground", func(c *gin.Context) {
			playground.Handler("GraphQL playground", "/query").ServeHTTP(c.Writer, c.Request)
		})
	}
}
