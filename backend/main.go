package main

import (
	"app/cmd/seeder"
	"app/cmd/server"
	"app/internal/config"
	"log"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		cfg, err := config.LoadServer()
		if err != nil {
			log.Fatal(err)
		}
		if err := server.StartServer(cfg); err != nil {
			log.Fatal(err)
		}
		return
	}

	switch os.Args[1] {
	case "seed":
		cfg, err := config.LoadSeeder()
		if err != nil {
			log.Fatal(err)
		}
		if err := seeder.SeedDb(cfg); err != nil {
			log.Fatal(err)
		}
	default:
		log.Println("Unknown command:", os.Args[1])
	}
}
