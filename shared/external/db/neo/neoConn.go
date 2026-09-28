package neo

// Neo4j is not wired into any binary for the first version of the app. It is
// meant for friends-of-friends recommendations; call Connect from a main and
// pass the driver into the resolver when that feature is picked up again.

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// Connect opens a Neo4j driver and verifies connectivity.
func Connect(ctx context.Context, uri, user, password string) (neo4j.DriverWithContext, error) {
	driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(user, password, ""))
	if err != nil {
		return nil, fmt.Errorf("neo4j: new driver: %w", err)
	}
	if err := driver.VerifyConnectivity(ctx); err != nil {
		_ = driver.Close(ctx)
		return nil, fmt.Errorf("neo4j: verify connectivity: %w", err)
	}
	return driver, nil
}
