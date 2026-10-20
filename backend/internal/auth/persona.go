package auth

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

// OwnPersona reads :persona_id and answers it only if it's one of the user's own personas, current or not.
func OwnPersona(c *gin.Context, q *db.Queries) (userID, personaID int64, ok bool) {
	userID, ok = UserID(c)
	if !ok {
		Unauthorized(c)
		return 0, 0, false
	}
	personaID, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil || personaID <= 0 {
		NotYourPersona(c)
		return 0, 0, false
	}
	_, err = q.GetPersonaByIdAndUserId(c.Request.Context(), db.GetPersonaByIdAndUserIdParams{ID: personaID, UserID: userID})
	if errors.Is(err, sql.ErrNoRows) {
		NotYourPersona(c)
		return 0, 0, false
	}
	if err != nil {
		log.Printf("auth: persona owner: %v", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
		return 0, 0, false
	}
	return userID, personaID, true
}

func NotYourPersona(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "not_your_persona"})
}
