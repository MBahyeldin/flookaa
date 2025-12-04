package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	pb "gRPC-client/app_service"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Command line flags
	serverAddr := flag.String("server", "", "gRPC server address")
	action := flag.String("action", "", "Action to perform: start or stop")
	flag.Parse()

	if *serverAddr == "" || *action == "" {
		fmt.Println("Usage: go run client.go -server <address> -action <start|stop>")
		os.Exit(1)
	}

	allowedActions := map[string]bool{"start": true, "stop": true, "restart": true, "switch": true}

	if !allowedActions[*action] {
		fmt.Println("Usage: go run client.go -server <address> -action <start|stop|restart|switch>")
		os.Exit(1)
	}

	// Connect to gRPC server
	conn, err := grpc.NewClient(*serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewAppServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var resp *pb.Status
	switch *action {
	case "start":
		resp, err = client.StartService(ctx, &pb.Empty{})
	case "stop":
		resp, err = client.StopService(ctx, &pb.Empty{})
	case "restart":
		resp, err = client.RestartApp(ctx, &pb.Empty{})
	case "switch":
		version := flag.String("version", "", "Version to switch to")
		flag.Parse()
		if *version == "" {
			fmt.Println("Usage: go run client.go -server <address> -action switch -version <version>")
			os.Exit(1)
		}
		resp, err = client.SwitchCurrent(ctx, &pb.SwitchRequest{Version: *version})
	}

	if err != nil {
		log.Fatalf("%s service failed: %v", *action, err)
	}

	fmt.Printf("%s service response: success=%v, message=%s\n", *action, resp.Success, resp.Message)
}
