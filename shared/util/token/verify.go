package token

import (
	"github.com/golang-jwt/jwt"
)

// Verify parses tokenString and checks it was signed with HS256 and this
// signer's secret.
func (s *Signer) Verify(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return s.secret, nil
	})
}
