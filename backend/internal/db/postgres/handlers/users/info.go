package users

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Info(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	q := h.q

	userRow, err := q.GetUserBasicInfo(ctx, userId.(int64))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No user found with this id"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          userRow.ID,
		"name":        userRow.FirstName + " " + userRow.LastName,
		"email":       userRow.EmailAddress,
		"is_verified": userRow.IsVerified.Bool,
		"thumbnail":   userRow.Thumbnail.String,
	})
}
