package encryption

import (
	"crypto/rand"
	"encoding/hex"
)

// GetUUID generates a unique UUID
func GetUUID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		panic(err) // In production, handle this error appropriately
	}
	return hex.EncodeToString(bytes)
}
