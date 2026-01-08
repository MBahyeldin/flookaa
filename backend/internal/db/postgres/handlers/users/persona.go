package users

import (
	"app/util/cookies"
	"database/sql"
	"fmt"
	"hash/fnv"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"time"

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

	personaRow, err := q.GetPersonaBasicInfo(ctx, personaId.(int64))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("No Persona found with this id: %v", personaId)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":              personaRow.ID,
		"name":            personaRow.Name,
		"first_name":      personaRow.FirstName,
		"last_name":       personaRow.LastName,
		"slug":            personaRow.Slug,
		"thumbnail":       personaRow.Thumbnail.String,
		"joined_channels": personaRow.JoinedChannels.RawMessage,
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
			"first_name":  persona.FirstName,
			"last_name":   persona.LastName,
			"thumbnail":   persona.Thumbnail.String,
			"is_default":  persona.IsDefault.Bool,
			"created_at":  persona.CreatedAt.Time,
			"slug":        persona.Slug,
			"privacy":     persona.Privacy,
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
		Privacy     string `json:"privacy" binding:"required"`
		Thumbnail   string `json:"thumbnail"`
		Bio         string `json:"bio"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("%v", err.Error())})
		return
	}

	q := db.New(postgres.DbConn)

	slug := generateSlug(req.FirstName, req.LastName)

	personaId, err := q.CreatePersona(ctx, db.CreatePersonaParams{
		UserID:      userId.(int64),
		Name:        req.Name,
		Description: req.Description,
		Bio:         sql.NullString{String: req.Bio, Valid: req.Bio != ""},
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Slug:        slug,
		Thumbnail:   sql.NullString{String: req.Thumbnail, Valid: req.Thumbnail != ""},
		Privacy:     getPersonaFromString(req.Privacy, db.PersonaPrivacyEnumPublic),
	})
	if err != nil {
		fmt.Println("Error creating persona:", err)
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
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("%v", err.Error())})
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

func generateSlug(firstName, lastName string) string {
	// hash firstName and lastName to create a unique slug
	dateNow := fmt.Sprintf("%v", time.Now().UnixNano())
	valueToHash := fmt.Sprintf("%s-%s-%v", firstName, lastName, dateNow)
	h := fnv.New32a()
	h.Write([]byte(valueToHash))
	return fmt.Sprintf("%x", h.Sum32())
}

func UpdatePersona(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No user is set in the context"})
		return
	}

	personaIdParam := c.Param("persona_id")
	var personaId int64
	_, err := fmt.Sscan(personaIdParam, &personaId)
	if err != nil || personaId == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid persona_id parameter"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
		Thumbnail   string `json:"thumbnail"`
		Bio         string `json:"bio"`
		Privacy     string `json:"privacy"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("%v", err.Error())})
		return
	}

	q := db.New(postgres.DbConn)

	persona, err := q.GetPersonaByIdAndUserId(ctx, db.GetPersonaByIdAndUserIdParams{
		ID:     personaId,
		UserID: userId.(int64),
	})
	if err != nil || persona.ID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Persona not found or does not belong to the user"})
		return
	}

	updatedPersona, err := q.UpdatePersonaByIdAndUserId(ctx, db.UpdatePersonaByIdAndUserIdParams{
		ID:          personaId,
		UserID:      userId.(int64),
		Name:        getStringOrDefault(req.Name, persona.Name),
		Description: getStringOrDefault(req.Description, persona.Description),
		Bio:         sql.NullString{String: getStringOrDefault(req.Bio, persona.Bio.String), Valid: req.Bio != ""},
		FirstName:   getStringOrDefault(req.FirstName, persona.FirstName),
		LastName:    getStringOrDefault(req.LastName, persona.LastName),
		Thumbnail:   sql.NullString{String: getStringOrDefault(req.Thumbnail, persona.Thumbnail.String), Valid: req.Thumbnail != ""},
		Slug:        persona.Slug,
		Privacy:     getPersonaFromString(req.Privacy, persona.Privacy),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update persona"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          updatedPersona.ID,
		"name":        updatedPersona.Name,
		"description": updatedPersona.Description,
		"bio":         updatedPersona.Bio.String,
		"first_name":  updatedPersona.FirstName,
		"last_name":   updatedPersona.LastName,
		"thumbnail":   updatedPersona.Thumbnail.String,
		"is_default":  updatedPersona.IsDefault.Bool,
		"created_at":  updatedPersona.CreatedAt.Time,
		"slug":        updatedPersona.Slug,
		"privacy":     updatedPersona.Privacy,
	})
}

func getPersonaFromString(input string, defaultValue db.PersonaPrivacyEnum) db.PersonaPrivacyEnum {
	switch input {
	case "public":
		return db.PersonaPrivacyEnumPublic
	case "private":
		return db.PersonaPrivacyEnumPrivate
	case "only_me":
		return db.PersonaPrivacyEnumOnlyMe
	default:
		return defaultValue
	}
}
