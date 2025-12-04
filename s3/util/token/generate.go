package token

import (
	"maps"
	"os"
	"time"

	"github.com/golang-jwt/jwt"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET_KEY"))

func Generate(c map[string]interface{}) (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(time.Hour * 72).Unix(),
		"iat": time.Now().Unix(),
	}
	maps.Copy(claims, c)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}
