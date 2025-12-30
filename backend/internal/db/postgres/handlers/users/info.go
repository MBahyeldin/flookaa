package users

import (
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

func Info(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	q := db.New(postgres.DbConn)

	userRow, err := q.GetPersonaBasicInfo(ctx, userId.(int64))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No user found with this id"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":              userRow.ID,
		"name":            userRow.FirstName + " " + userRow.LastName,
		"email":           userRow.EmailAddress,
		"is_verified":     userRow.IsVerified.Bool,
		"thumbnail":       userRow.Thumbnail.String,
		"joined_channels": userRow.JoinedChannels.RawMessage,
	})
}
