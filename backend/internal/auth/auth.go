// Package auth parses the session JWT and enforces the route tiers.
//
// Middleware only parses: it never rejects a request. Rejection is done per
// route group by RequireSession (401), RequireUser (401/403) and
// RequirePersona (401/403), plus RequireAdministrator, so a route is public only when it is mounted
// outside all three.
package auth

import (
	"context"
	"log"
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
	keyVerified  = "email_verified"
)

// ErrPersonaRequired is the error code the frontend matches to show persona
// selection instead of the login page.
const ErrPersonaRequired = "persona_required"

const ErrNotAdministrator = "not_administrator"

// ErrEmailUnverified is the error code the frontend matches to show the
// verify-email step.
const ErrEmailUnverified = "email_unverified"

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
		// Tokens issued before the claim existed count as unverified; auth/info reissues them.
		verified, _ := claims["email_verified"].(bool)
		c.Set(keyVerified, verified)
		// persona_id is 0 until the user picks a persona.
		if personaID, ok := claims["persona_id"].(float64); ok {
			c.Set(keyPersonaID, int64(personaID))
		}
	}
}

// RequireSession rejects requests without a valid session with 401, verified
// or not. Only the routes an unverified user needs use it.
func RequireSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := UserID(c); !ok {
			Unauthorized(c)
			return
		}
		c.Next()
	}
}

// RequireUser rejects requests without a valid session (401) or with an
// unverified email (403 email_unverified).
func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := UserID(c); !ok {
			Unauthorized(c)
			return
		}
		if !EmailVerified(c) {
			EmailUnverified(c)
			return
		}
		c.Next()
	}
}

// RequirePersona rejects requests without a session (401), with an unverified
// email (403 email_unverified) or without a chosen persona (403
// persona_required).
func RequirePersona() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := UserID(c); !ok {
			Unauthorized(c)
			return
		}
		if !EmailVerified(c) {
			EmailUnverified(c)
			return
		}
		if _, ok := PersonaID(c); !ok {
			PersonaRequired(c)
			return
		}
		c.Next()
	}
}

// RequireAdministrator checks the role per request, not in the JWT: a role can be taken away.
func RequireAdministrator(isAdmin func(ctx context.Context, userID int64) (bool, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := UserID(c)
		if !ok {
			Unauthorized(c)
			return
		}
		if !EmailVerified(c) {
			EmailUnverified(c)
			return
		}
		admin, err := isAdmin(c.Request.Context(), userID)
		if err != nil {
			log.Printf("auth: administrator check for user %d: %v", userID, err)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
			return
		}
		if !admin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": ErrNotAdministrator})
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

// EmailVerified reports whether the session's token says the email is verified.
func EmailVerified(c *gin.Context) bool {
	return c.GetBool(keyVerified)
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

func EmailUnverified(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": ErrEmailUnverified})
}
