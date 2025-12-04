package middlewares

import (
	"app/util/token"
	"fmt"
	"log"

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
		c.Set("user_id", int64(claims["user_id"].(float64)))
		c.Set("email_address", claims["email_address"].(string))
		log.Println("Verified JWT for user_id:", int64(claims["user_id"].(float64)))
		c.Next()
	}
}
