package users

import (
	"app/internal/models"
	"app/util/token"
	"fmt"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
)

func Verify(c *gin.Context) {
	var req models.VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	token, err := token.Verify(req.VerificationCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code"})
		return
	}
	claims := token.Claims.(jwt.MapClaims)
	fmt.Println("Claims:", claims["user_id"])
	q := db.New(postgres.DbConn)

	verify, ok := claims["verify"].(bool)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "verify field is missing or not a boolean"})
		return
	}

	if !verify {
		c.JSON(http.StatusBadRequest, gin.H{"error": "verify field is not true"})
		return
	}

	userId, ok := claims["user_id"].(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id field is missing or not an integer"})
		return
	}
	if !(userId > 0) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	data, err := q.VerifyUserEmail(c.Request.Context(), int64(userId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification successful", "email": data.EmailAddress})
}
