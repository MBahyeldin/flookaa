package main

import (
	"app/cmd/seeder"
	"app/cmd/server"
	"log"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		server.StartServer()
	}

	switch os.Args[1] {
	case "seed":
		seeder.SeedDb()
	default:
		log.Println("Unknown command:", os.Args[1])
	}
}
