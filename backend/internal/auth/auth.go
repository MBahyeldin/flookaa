// Package auth parses the session JWT and enforces the route tiers.
//
// Middleware only parses: it never rejects a request. Rejection is done per
// route group by RequireUser (401) and RequirePersona (401/403), so a route is
// public only when it is mounted outside both.
package auth

import (
	"net/http"
	"shared/util/token"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
)

// Gin context keys. shared/pkg/graph/resolvers reads the same keys.
const (
	keyUserID    = "user_id"
	keyPersonaID = "persona_id"
	keyEmail     = "email_address"
)

// ErrPersonaRequired is the error code the frontend matches to show persona
// selection instead of the login page.
const ErrPersonaRequired = "persona_required"

// Middleware reads the jwt cookie and, when it is valid and carries a user,
// stores the identity in the context. Invalid or missing tokens leave the
// request anonymous.
func Middleware(signer *token.Signer) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer c.Next()

		jwtCookie, err := c.Cookie("jwt")
		if err != nil {
			return
		}
		parsed, err := signer.Verify(jwtCookie)
		if err != nil || !parsed.Valid {
			return
		}
		claims, ok := parsed.Claims.(jwt.MapClaims)
		if !ok {
			return
		}

		// JSON numbers decode as float64.
		userID, ok := claims["user_id"].(float64)
		if !ok || userID == 0 {
			return
		}
		c.Set(keyUserID, int64(userID))

		if email, ok := claims["email_address"].(string); ok {
			c.Set(keyEmail, email)
		}
		// persona_id is 0 until the user picks a persona.
		if personaID, ok := claims["persona_id"].(float64); ok {
			c.Set(keyPersonaID, int64(personaID))
		}
	}
}

// RequireUser rejects requests without a valid session with 401.
func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := UserID(c); !ok {
			Unauthorized(c)
			return
		}
		c.Next()
	}
}

// RequirePersona rejects requests without a session (401) or without a chosen
// persona (403 persona_required).
func RequirePersona() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := UserID(c); !ok {
			Unauthorized(c)
			return
		}
		if _, ok := PersonaID(c); !ok {
			PersonaRequired(c)
			return
		}
		c.Next()
	}
}

// UserID returns the authenticated user, if any.
func UserID(c *gin.Context) (int64, bool) {
	id, ok := c.Get(keyUserID)
	if !ok {
		return 0, false
	}
	v, ok := id.(int64)
	return v, ok && v != 0
}

// PersonaID returns the persona the session acts as, if one is chosen.
func PersonaID(c *gin.Context) (int64, bool) {
	id, ok := c.Get(keyPersonaID)
	if !ok {
		return 0, false
	}
	v, ok := id.(int64)
	return v, ok && v != 0
}

// Email returns the session's email address, or "".
func Email(c *gin.Context) string {
	return c.GetString(keyEmail)
}

func Unauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
}

func PersonaRequired(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": ErrPersonaRequired})
}
