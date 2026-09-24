package middlewares

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware requires a static bearer token on every request.
//
// Note this is deliberately stricter than the backend's AuthMiddleware, which
// always calls c.Next() and leaves the decision to each handler. Here there is
// no notion of an anonymous caller: an unauthenticated request can send a
// WhatsApp message from the linked account, so it is aborted outright.
func AuthMiddleware(expectedToken string) gin.HandlerFunc {
	expected := []byte(expectedToken)

	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}

		token, ok := bearerToken(header)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header must be a bearer token"})
			return
		}

		// Constant-time compare: == short-circuits on the first differing byte
		// and leaks the token prefix through response timing.
		if subtle.ConstantTimeCompare([]byte(token), expected) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Next()
	}
}

func bearerToken(header string) (string, bool) {
	const prefix = "Bearer "
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return "", false
	}
	return strings.TrimSpace(header[len(prefix):]), true
}
