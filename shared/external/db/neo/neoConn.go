package neo

import (
	"context"
	"fmt"
	"os"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var Neo4jDriver neo4j.DriverWithContext

func init() {
	ctx := context.Background()
	dbUri := os.Getenv("NEO4J_URI")
	dbUser := os.Getenv("NEO4J_USER")
	dbPassword := os.Getenv("NEO4J_PASSWORD")
	driver, err := neo4j.NewDriverWithContext(
		dbUri,
		neo4j.BasicAuth(dbUser, dbPassword, ""))
	Neo4jDriver = driver

	if err != nil {
		panic(err)
	}
	fmt.Println("Connected to Neo4j database!")

	err = driver.VerifyConnectivity(ctx)
	if err != nil {
		panic(err)
	}

	fmt.Println("Connection established.")
}
