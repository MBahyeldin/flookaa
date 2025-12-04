package users

import (
	"github.com/gin-gonic/gin"
)

func Verify(c *gin.Context) {
	// var req models.VerifyRequest
	// if err := c.ShouldBindJSON(&req); err != nil {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	// 	return
	// }
	// token, err := token.Verify(req.VerificationCode)
	// if err != nil {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code"})
	// 	return
	// }
	// claims := token.Claims.(jwt.MapClaims)
	// // update user status to verified in the database if needed
	// c.JSON(http.StatusOK, gin.H{"message": "Verification successful", "email": claims["email"]})
}
