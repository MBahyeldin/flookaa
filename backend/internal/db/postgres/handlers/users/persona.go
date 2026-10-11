package users

import (
	"app/internal/auth"
	"app/util/cookies"
	"database/sql"
	"fmt"
	"hash/fnv"
	"log"
	"net/http"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ReadCurrentPersona(c *gin.Context) {
	ctx := c.Request.Context()

	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	q := h.q

	personaRow, err := q.GetPersonaBasicInfo(ctx, personaId)
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

func (h *Handler) ListPersonas(c *gin.Context) {
	ctx := c.Request.Context()

	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	q := h.q

	personas, err := q.GetUserPersonasByUserId(ctx, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve personas"})
		return
	}

	var response []gin.H
	for _, persona := range personas {
		response = append(response, gin.H{
			"id":              persona.ID,
			"name":            persona.Name,
			"description":     persona.Description,
			"bio":             persona.Bio.String,
			"first_name":      persona.FirstName,
			"last_name":       persona.LastName,
			"thumbnail":       persona.Thumbnail.String,
			"is_default":      persona.IsDefault.Bool,
			"created_at":      persona.CreatedAt.Time,
			"slug":            persona.Slug,
			"privacy":         persona.Privacy,
			"show_on_profile": persona.ShowOnProfile,
		})
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) CreatePersona(c *gin.Context) {
	ctx := c.Request.Context()

	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	var req struct {
		Name          string `json:"name" binding:"required"`
		Description   string `json:"description" binding:"required"`
		FirstName     string `json:"first_name" binding:"required"`
		LastName      string `json:"last_name" binding:"required"`
		Privacy       string `json:"privacy" binding:"required"`
		Thumbnail     string `json:"thumbnail"`
		Bio           string `json:"bio"`
		ShowOnProfile *bool  `json:"show_on_profile"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("%v", err.Error())})
		return
	}

	privacy := getPersonaFromString(req.Privacy, db.PersonaPrivacyEnumPublic)
	showOnProfile, ok := resolveShowOnProfile(privacy, req.ShowOnProfile, false)
	if !ok {
		showOnProfileRequiresPublic(c)
		return
	}

	q := h.q

	slug := generateSlug(req.FirstName, req.LastName)

	personaId, err := q.CreatePersona(ctx, db.CreatePersonaParams{
		UserID:        userId,
		Name:          req.Name,
		Description:   req.Description,
		Bio:           sql.NullString{String: req.Bio, Valid: req.Bio != ""},
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		Slug:          slug,
		Thumbnail:     sql.NullString{String: req.Thumbnail, Valid: req.Thumbnail != ""},
		Privacy:       privacy,
		ShowOnProfile: showOnProfile,
	})
	if err != nil {
		fmt.Println("Error creating persona:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create persona"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"persona_id": personaId})
}

func (h *Handler) SetCurrentPersona(c *gin.Context) {
	ctx := c.Request.Context()

	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	var req struct {
		PersonaID int64 `json:"persona_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("%v", err.Error())})
		return
	}

	q := h.q

	persona, err := q.GetPersonaByIdAndUserId(ctx, db.GetPersonaByIdAndUserIdParams{
		ID:     req.PersonaID,
		UserID: userId,
	})
	if err != nil || persona.ID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Persona not found or does not belong to the user"})
		return
	}

	// generate new JWT with updated persona_id
	jwt, err := h.LoginToken(UserMinimal{ID: userId, EmailAddress: auth.Email(c), PersonaId: persona.ID})
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

func (h *Handler) UpdatePersona(c *gin.Context) {
	ctx := c.Request.Context()

	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
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
		Name          string `json:"name"`
		Description   string `json:"description"`
		FirstName     string `json:"first_name"`
		LastName      string `json:"last_name"`
		Thumbnail     string `json:"thumbnail"`
		Bio           string `json:"bio"`
		Privacy       string `json:"privacy"`
		ShowOnProfile *bool  `json:"show_on_profile"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("%v", err.Error())})
		return
	}

	q := h.q

	persona, err := q.GetPersonaByIdAndUserId(ctx, db.GetPersonaByIdAndUserIdParams{
		ID:     personaId,
		UserID: userId,
	})
	if err != nil || persona.ID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Persona not found or does not belong to the user"})
		return
	}

	privacy := getPersonaFromString(req.Privacy, persona.Privacy)
	showOnProfile, ok := resolveShowOnProfile(privacy, req.ShowOnProfile, persona.ShowOnProfile)
	if !ok {
		showOnProfileRequiresPublic(c)
		return
	}

	updatedPersona, err := q.UpdatePersonaByIdAndUserId(ctx, db.UpdatePersonaByIdAndUserIdParams{
		ID:            personaId,
		UserID:        userId,
		Name:          getStringOrDefault(req.Name, persona.Name),
		Description:   getStringOrDefault(req.Description, persona.Description),
		Bio:           sql.NullString{String: getStringOrDefault(req.Bio, persona.Bio.String), Valid: req.Bio != ""},
		FirstName:     getStringOrDefault(req.FirstName, persona.FirstName),
		LastName:      getStringOrDefault(req.LastName, persona.LastName),
		Thumbnail:     sql.NullString{String: getStringOrDefault(req.Thumbnail, persona.Thumbnail.String), Valid: req.Thumbnail != ""},
		Slug:          persona.Slug,
		Privacy:       privacy,
		ShowOnProfile: showOnProfile,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update persona"})
		return
	}
	if err := h.personas.DeletePersonaInfo(ctx, strconv.FormatInt(personaId, 10)); err != nil {
		log.Println("redis delete persona error:", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"id":              updatedPersona.ID,
		"name":            updatedPersona.Name,
		"description":     updatedPersona.Description,
		"bio":             updatedPersona.Bio.String,
		"first_name":      updatedPersona.FirstName,
		"last_name":       updatedPersona.LastName,
		"thumbnail":       updatedPersona.Thumbnail.String,
		"is_default":      updatedPersona.IsDefault.Bool,
		"created_at":      updatedPersona.CreatedAt.Time,
		"slug":            updatedPersona.Slug,
		"privacy":         updatedPersona.Privacy,
		"show_on_profile": updatedPersona.ShowOnProfile,
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

// A non-public persona is never linked, so the flag clears when privacy changes.
func resolveShowOnProfile(privacy db.PersonaPrivacyEnum, requested *bool, current bool) (bool, bool) {
	if privacy != db.PersonaPrivacyEnumPublic {
		return false, requested == nil || !*requested
	}
	if requested != nil {
		return *requested, true
	}
	return current, true
}

func showOnProfileRequiresPublic(c *gin.Context) {
	c.JSON(http.StatusBadRequest, gin.H{"error": "show_on_profile_requires_public"})
}

func personaIDParam(c *gin.Context) (int64, bool) {
	personaID, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil || personaID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid persona_id parameter"})
		return 0, false
	}
	return personaID, true
}

func (h *Handler) ReadPersona(c *gin.Context) {
	ctx := c.Request.Context()

	viewerID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	personaID, ok := personaIDParam(c)
	if !ok {
		return
	}

	rows, err := h.q.ResolvePersonasForViewer(ctx, db.ResolvePersonasForViewerParams{
		Ids:      []int64{personaID},
		ViewerID: viewerID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve persona"})
		return
	}
	if len(rows) == 0 || (!rows[0].Visible && rows[0].Privacy != db.PersonaPrivacyEnumPrivate) {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}

	follow, err := h.q.GetPersonaFollowInfo(ctx, db.GetPersonaFollowInfoParams{
		PersonaID: personaID,
		ViewerID:  viewerID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve persona"})
		return
	}

	p := rows[0]
	if !p.Visible {
		c.JSON(http.StatusOK, gin.H{
			"id":            p.ID,
			"locked":        true,
			"follow_status": followStatus(follow.FollowStatus),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                p.ID,
		"locked":            false,
		"first_name":        p.FirstName,
		"last_name":         p.LastName,
		"slug":              p.Slug,
		"thumbnail":         p.Thumbnail.String,
		"bio":               p.Bio.String,
		"followers_count":   follow.FollowersCount,
		"following_count":   follow.FollowingCount,
		"follow_status":     followStatus(follow.FollowStatus),
		"requires_approval": follow.RequiresApproval,
	})
}

// A rejected request reads as pending, so the requester never learns of it.
func followStatus(s db.NullPersonaFollowStatusEnum) *string {
	if !s.Valid {
		return nil
	}
	status := string(db.PersonaFollowStatusEnumPending)
	if s.PersonaFollowStatusEnum == db.PersonaFollowStatusEnumActive {
		status = string(db.PersonaFollowStatusEnumActive)
	}
	return &status
}

func (h *Handler) ConnectedPersonas(c *gin.Context) {
	ctx := c.Request.Context()

	viewerID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	personaID, ok := personaIDParam(c)
	if !ok {
		return
	}

	visible, err := access.VisiblePersonas(ctx, h.q, viewerID, []int64{personaID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve persona"})
		return
	}
	if !visible[personaID] {
		c.JSON(http.StatusNotFound, gin.H{"error": "persona not found"})
		return
	}

	rows, err := h.q.ListConnectedPersonas(ctx, db.ListConnectedPersonasParams{
		PersonaID: personaID,
		ViewerID:  viewerID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve connected personas"})
		return
	}

	personas := make([]gin.H, 0, len(rows))
	for _, p := range rows {
		personas = append(personas, gin.H{
			"id":            p.ID,
			"name":          p.Name,
			"first_name":    p.FirstName,
			"last_name":     p.LastName,
			"slug":          p.Slug,
			"thumbnail":     p.Thumbnail.String,
			"bio":           p.Bio.String,
			"follow_status": followStatus(p.FollowStatus),
		})
	}

	c.JSON(http.StatusOK, gin.H{"personas": personas})
}
