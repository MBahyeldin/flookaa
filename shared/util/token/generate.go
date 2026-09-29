package token

import (
	"fmt"
	"maps"
	"time"

	"github.com/golang-jwt/jwt"
)

// MinSecretLength is the shortest HS256 secret NewSigner accepts.
const MinSecretLength = 32

// Signer issues and verifies HS256 JWTs with one secret.
type Signer struct {
	secret []byte
}

// NewSigner refuses an empty or short secret: an empty HMAC key would let
// anyone forge a valid token.
func NewSigner(secret string) (*Signer, error) {
	if len(secret) < MinSecretLength {
		return nil, fmt.Errorf("token: secret must be at least %d bytes, got %d", MinSecretLength, len(secret))
	}
	return &Signer{secret: []byte(secret)}, nil
}

func (s *Signer) Generate(c map[string]interface{}) (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(time.Hour * 72).Unix(),
		"iat": time.Now().Unix(),
	}
	maps.Copy(claims, c)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}
