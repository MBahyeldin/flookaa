package users

import (
	"app/internal/auth"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Info(c *gin.Context) {
	ctx := c.Request.Context()

	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	q := h.q

	userRow, err := q.GetUserBasicInfo(ctx, userId)
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
