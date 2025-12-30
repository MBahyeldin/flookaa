package middlewares

import (
	"fmt"
	"log"
	"shared/util/token"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("Verifying JWT token")
		jwtCookie, err := c.Cookie("jwt")
		if err != nil {
			fmt.Println("No JWT cookie found:", err)
			c.Next()
			return
		}
		log.Println("Found JWT cookie:", jwtCookie)
		token, err := token.Verify(jwtCookie)
		if err != nil || !token.Valid {
			c.Next()
			return
		}
		log.Println("JWT token is valid")
		claims := token.Claims.(jwt.MapClaims)
		log.Println("JWT claims:", claims)
		if _, ok := claims["email_address"]; !ok {
			log.Println("No email_address fount in JWT claims")
			c.Next()
			return
		}
		c.Set("email_address", claims["email_address"].(string))

		if _, ok := claims["user_id"]; !ok {
			log.Println("No user fount in JWT claims")
			c.Next()
			return
		}
		c.Set("user_id", int64(claims["user_id"].(float64)))

		if _, ok := claims["persona_id"]; !ok {
			log.Println("No persona fount in JWT claims")
			c.Next()
			return
		}
		c.Set("persona_id", int64(claims["persona_id"].(float64)))
		log.Println("Verified JWT for user_id:", int64(claims["user_id"].(float64)))
		c.Next()
	}
}
