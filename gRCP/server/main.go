package main

import (
	"context"
	"flag"
	"fmt"
	"net"
	"os"
	"os/exec"

	pb "gRPC-server/app_service" // Update this import path to your generated proto package

	"google.golang.org/grpc"
)

var serviceName string
var systemdServiceFile string

type Server struct {
	pb.UnimplementedAppServiceServer
}

func (s *Server) StopService(ctx context.Context, e *pb.Empty) (*pb.Status, error) {
	cmd := exec.Command("sudo", "/bin/systemctl", "stop", systemdServiceFile)
	if err := cmd.Run(); err != nil {
		return &pb.Status{Success: false, Message: err.Error()}, nil
	}
	return &pb.Status{Success: true, Message: "Service stopped"}, nil
}

func (s *Server) StartService(ctx context.Context, e *pb.Empty) (*pb.Status, error) {
	cmd := exec.Command("sudo", "/bin/systemctl", "start", systemdServiceFile)
	if err := cmd.Run(); err != nil {
		return &pb.Status{Success: false, Message: err.Error()}, nil
	}
	return &pb.Status{Success: true, Message: "Service started"}, nil
}

func (s *Server) SwitchCurrent(ctx context.Context, req *pb.SwitchRequest) (*pb.Status, error) {
	newVersionPath := fmt.Sprintf("/opt/%s/%s", serviceName, req.Version)
	os.Remove(fmt.Sprintf("/opt/%s/current", serviceName))
	err := os.Symlink(newVersionPath, fmt.Sprintf("/opt/%s/current", serviceName))
	if err != nil {
		return &pb.Status{Success: false, Message: err.Error()}, nil
	}
	// Restart the service to apply the new version
	cmd := exec.Command("sudo", "/bin/systemctl", "restart", systemdServiceFile)
	if err := cmd.Run(); err != nil {
		return &pb.Status{Success: false, Message: err.Error()}, nil
	}
	fmt.Println("Switched to version:", req.Version)
	return &pb.Status{Success: true, Message: "Service switched"}, nil
}

func (s *Server) RestartService(ctx context.Context, e *pb.Empty) (*pb.Status, error) {
	cmd := exec.Command("sudo", "/bin/systemctl", "restart", systemdServiceFile)
	if err := cmd.Run(); err != nil {
		return &pb.Status{Success: false, Message: err.Error()}, nil
	}
	return &pb.Status{Success: true, Message: "Service restarted"}, nil
}

func main() {
	// read service name from params
	flag.StringVar(&serviceName, "service", "", "Name of the service to control")
	flag.Parse()
	if serviceName == "" {
		panic("usage: server -service <service-name>")
	}
	systemdServiceFile = fmt.Sprintf("%s.service", serviceName)

	port := os.Getenv("GRPC_PORT")
	if port == "" {
		panic("GRPC_PORT environment variable not set")
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		panic(err)
	}

	watchedDir := os.Getenv("GRPC_WATCHING_DIR")
	if watchedDir == "" {
		panic("GRPC_WATCHING_DIR environment variable not set")
	}
	runningAppDir := fmt.Sprintf("/opt/%s", serviceName)

	grpcServer := grpc.NewServer()
	server := &Server{}
	go WatchDirectory(watchedDir, runningAppDir, server)

	pb.RegisterAppServiceServer(grpcServer, server)
	fmt.Println("gRPC server running on", port)
	if err := grpcServer.Serve(lis); err != nil {
		panic(err)
	}
}
