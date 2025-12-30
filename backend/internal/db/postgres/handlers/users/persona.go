package users

import (
	"app/util/cookies"
	"database/sql"
	"fmt"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

func ReadCurrentPersona(c *gin.Context) {
	ctx := c.Request.Context()

	personaId, exists := c.Get("persona_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No persona is set in the context"})
		return
	}

	if personaId.(int64) == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No persona is chosen yet"})
		return
	}

	q := db.New(postgres.DbConn)

	userRow, err := q.GetPersonaBasicInfo(ctx, personaId.(int64))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("No Persona found with this id: %v", personaId)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":              userRow.ID,
		"name":            userRow.FirstName + " " + userRow.LastName,
		"thumbnail":       userRow.Thumbnail.String,
		"joined_channels": userRow.JoinedChannels.RawMessage,
	})
}

func ListPersonas(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No user is set in the context"})
		return
	}

	q := db.New(postgres.DbConn)

	personas, err := q.GetUserPersonasByUserId(ctx, userId.(int64))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve personas"})
		return
	}

	var response []gin.H
	for _, persona := range personas {
		response = append(response, gin.H{
			"id":          persona.ID,
			"name":        persona.Name,
			"description": persona.Description,
			"bio":         persona.Bio.String,
			"firstName":   persona.FirstName,
			"lastName":    persona.LastName,
			"thumbnail":   persona.Thumbnail.String,
			"isDefault":   persona.IsDefault.Bool,
		})
	}

	c.JSON(http.StatusOK, response)
}

func CreatePersona(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No user is set in the context"})
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description" binding:"required"`
		FirstName   string `json:"first_name" binding:"required"`
		LastName    string `json:"last_name" binding:"required"`
		Thumbnail   string `json:"thumbnail"`
		Bio         string `json:"bio"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	q := db.New(postgres.DbConn)

	personaId, err := q.CreatePersona(ctx, db.CreatePersonaParams{
		UserID:      userId.(int64),
		Name:        req.Name,
		Description: req.Description,
		Bio:         sql.NullString{String: req.Bio, Valid: req.Bio != ""},
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Thumbnail:   sql.NullString{String: req.Thumbnail, Valid: req.Thumbnail != ""},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create persona"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"persona_id": personaId})
}

func SetCurrentPersona(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No user is set in the context"})
		return
	}

	var req struct {
		PersonaID int64 `json:"persona_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	q := db.New(postgres.DbConn)

	persona, err := q.GetPersonaByIdAndUserId(ctx, db.GetPersonaByIdAndUserIdParams{
		ID:     req.PersonaID,
		UserID: userId.(int64),
	})
	if err != nil || persona.ID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Persona not found or does not belong to the user"})
		return
	}

	// generate new JWT with updated persona_id
	jwt, err := GetLoginToken(UserMinimal{ID: userId.(int64), EmailAddress: c.GetString("email_address"), PersonaId: persona.ID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	cookies.AddCookieToContext(c, "jwt", jwt)

	c.JSON(http.StatusOK, gin.H{"message": "Current persona set successfully"})
}
