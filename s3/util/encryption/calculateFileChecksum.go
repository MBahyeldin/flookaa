package encryption

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
)

func CalculateFileChecksum(filePath string) (string, error) {
	// Open the file
	file, err := os.Open(filePath)

	if err != nil {
		return "", err
	}

	defer file.Close()
	// Create a new SHA256 hash
	hasher := sha256.New()
	// Copy the file content into the hash
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}
	// Return the hex representation of the hash
	return fmt.Sprintf("%x", hasher.Sum(nil)), nil

}
