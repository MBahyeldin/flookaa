package users

import (
	"app/internal/auth"
	"app/internal/models"
	"database/sql"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetProfile(c *gin.Context) {
	ctx := c.Request.Context()

	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	q := h.q

	user, err := q.GetUserProfile(ctx, userId)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                   user.ID,
		"name":                 user.FirstName + " " + user.LastName,
		"email_address":        user.EmailAddress,
		"is_verified":          user.IsVerified.Bool,
		"thumbnail":            user.Thumbnail.String,
		"first_name":           user.FirstName,
		"last_name":            user.LastName,
		"city_id":              user.CityID.Int64,
		"country_id":           user.CountryID.Int64,
		"state_id":             user.StateID.Int64,
		"postal_code":          user.PostalCode.String,
		"onboarding_completed": user.OnboardingCompleted,
		"onboarding_step":      user.OnboardingStep,
	})
}

// patch update /user/profile
func (h *Handler) UpdateProfile(c *gin.Context) {
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	var input models.PatchUserRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	q := h.q
	ctx := c.Request.Context()

	currentUser, err := q.GetUserProfile(ctx, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch current user data"})
		return
	}

	updatedUser, err := q.UpdateUser(ctx, db.UpdateUserParams{
		ID:                  userId,
		FirstName:           getStringOrDefault(input.FirstName, currentUser.FirstName),
		LastName:            getStringOrDefault(input.LastName, currentUser.LastName),
		EmailAddress:        getStringOrDefault(input.EmailAddress, currentUser.EmailAddress),
		HashedPassword:      sql.NullString{String: input.HashedPassword, Valid: input.HashedPassword != ""},
		Thumbnail:           sql.NullString{String: input.Thumbnail, Valid: input.Thumbnail != ""},
		CityID:              parseNullableInt64(input.CityID),
		CountryID:           parseNullableInt64(input.CountryID),
		StateID:             parseNullableInt64(input.StateID),
		PostalCode:          sql.NullString{String: input.PostalCode, Valid: input.PostalCode != ""},
		OnboardingCompleted: sql.NullBool{Bool: input.OnboardingCompleted, Valid: true},
		OnboardingStep:      parseNullableInt32(strconv.Itoa(int(input.OnboardingStep))),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updatedUser})
}

func parseNullableInt32(s string) sql.NullInt32 {
	if s == "" {
		return sql.NullInt32{Valid: false}
	}
	v, err := strconv.ParseInt(s, 10, 32)
	if err != nil {
		return sql.NullInt32{Valid: false}
	}
	return sql.NullInt32{Int32: int32(v), Valid: true}
}

func parseNullableInt64(s string) sql.NullInt64 {
	if s == "" {
		return sql.NullInt64{Valid: false}
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: v, Valid: true}
}

func getStringOrDefault(s string, defaultVal string) string {
	if s == "" {
		return defaultVal
	}
	return s
}
