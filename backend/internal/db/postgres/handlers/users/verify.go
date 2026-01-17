package users

import (
	"app/internal/models"
	"app/util/verification"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Verify(c *gin.Context) {
	var req models.VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	verificationCode := req.VerificationCode
	userId := c.GetInt64("user_id")

	err := verification.VerifyUserCode(userId, verificationCode)

	if err != nil {
		c.JSON(401, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification successful"})
}
