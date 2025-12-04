package main

import (
	"os"
	"s3/cmd/server"
)

func main() {
	if len(os.Args) < 2 {
		server.StartServer()
	}
}
