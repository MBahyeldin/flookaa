package main

import (
	"context"
	"fmt"
	pb "gRPC-server/app_service"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

// copyFile copies a file from src to dst
func moveFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	err = os.Rename(sourceFile.Name(), destFile.Name())
	if err != nil {
		return err
	}
	return nil
}

// copyDir copies all files from srcDir to dstDir
func copyDir(srcDir, dstDir string) error {
	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}

		destPath := filepath.Join(dstDir, relPath)

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		} else {
			return moveFile(path, destPath)
		}
	})
}

func waitUntilComplete(filePath string) {
	var prevSize int64 = -1
	for {
		info, err := os.Stat(filePath)
		if err != nil {
			break
		}
		if info.Size() == prevSize {
			break // file size stabilized
		}
		prevSize = info.Size()
		time.Sleep(200 * time.Millisecond)
	}
}

// watchDirectory watches srcDir and copies its content to dstDir on any change
func WatchDirectory(srcDir, dstDir string, server *Server) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal(err)
	}
	defer watcher.Close()

	fmt.Println("Watching directory:", srcDir)
	err = watcher.Add(srcDir)
	if err != nil {
		log.Fatal(err)
	}

	isProcessing := make(chan bool, 1)

	// Start a goroutine to handle events
	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				select {
				case isProcessing <- true:
				default:
					continue
				}
				if !ok {
					return
				}
				if event.Op.String() != "CREATE" {
					<-isProcessing
					continue
				}
				// Wait until file operations are complete
				waitUntilComplete(event.Name)
				// Simple strategy: copy entire directory on any event
				timeStamp := time.Now().Format("20060102150405")
				err := copyDir(srcDir, fmt.Sprintf("%s/%s", dstDir, timeStamp))
				if err != nil {
					log.Println("Error copying directory:", err)
					<-isProcessing

				} else {
					func() {
						ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
						defer func() {
							cancel()
							<-isProcessing
							fmt.Println("Ready for next event")
						}()
						fmt.Println("Directory copied successfully")
						server.SwitchCurrent(ctx, &pb.SwitchRequest{Version: timeStamp})
					}()
				}

			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Println("Watcher error:", err)
			}
		}
	}()
	// Keep the program running
	done := make(chan bool)
	<-done
}
