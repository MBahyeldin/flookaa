package users

import (
	"app/internal/auth"
	"app/internal/models"
	"database/sql"
	"errors"
	"net/http"
	"shared/pkg/db"
	"strconv"
	"time"

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
		"id":            user.ID,
		"name":          user.FirstName + " " + user.LastName,
		"email_address": user.EmailAddress,
		"is_verified":   user.IsVerified.Bool,
		"thumbnail":     user.Thumbnail.String,
		"first_name":    user.FirstName,
		"last_name":     user.LastName,
		"city_id":       user.CityID.Int64,
		"country_id":    user.CountryID.Int64,
		"state_id":      user.StateID.Int64,
		"postal_code":   user.PostalCode.String,
		"date_of_birth": dateOfBirthJSON(user.DateOfBirth),
		"gender":        genderJSON(user.Gender),
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

	dob, err := parseDateOfBirth(input.DateOfBirth, time.Now().UTC())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_date_of_birth"})
		return
	}
	gender, err := parseGender(input.Gender)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_gender"})
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
		ID:             userId,
		FirstName:      getStringOrDefault(input.FirstName, currentUser.FirstName),
		LastName:       getStringOrDefault(input.LastName, currentUser.LastName),
		EmailAddress:   getStringOrDefault(input.EmailAddress, currentUser.EmailAddress),
		HashedPassword: sql.NullString{String: input.HashedPassword, Valid: input.HashedPassword != ""},
		Thumbnail:      sql.NullString{String: input.Thumbnail, Valid: input.Thumbnail != ""},
		CityID:         parseNullableInt64(input.CityID),
		CountryID:      parseNullableInt64(input.CountryID),
		StateID:        parseNullableInt64(input.StateID),
		PostalCode:     sql.NullString{String: input.PostalCode, Valid: input.PostalCode != ""},
		DateOfBirth:    dob,
		Gender:         gender,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"id":                       updatedUser.ID,
		"first_name":               updatedUser.FirstName,
		"last_name":                updatedUser.LastName,
		"email_address":            updatedUser.EmailAddress,
		"updated_at":               updatedUser.UpdatedAt,
		"thumbnail":                updatedUser.Thumbnail,
		"is_verified":              updatedUser.IsVerified,
		"city_id":                  updatedUser.CityID,
		"state_id":                 updatedUser.StateID,
		"country_id":               updatedUser.CountryID,
		"postal_code":              updatedUser.PostalCode,
		"other_platforms_accounts": updatedUser.OtherPlatformsAccounts,
		"date_of_birth":            dateOfBirthJSON(updatedUser.DateOfBirth),
		"gender":                   genderJSON(updatedUser.Gender),
	}})
}

const dateLayout = "2006-01-02"

var minDateOfBirth = time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)

// A nil value leaves the field unchanged; it can't be cleared once set.
func parseDateOfBirth(s *string, now time.Time) (sql.NullTime, error) {
	if s == nil {
		return sql.NullTime{}, nil
	}
	t, err := time.Parse(dateLayout, *s)
	if err != nil {
		return sql.NullTime{}, err
	}
	if t.Before(minDateOfBirth) || t.After(now) {
		return sql.NullTime{}, errors.New("date of birth out of range")
	}
	return sql.NullTime{Time: t, Valid: true}, nil
}

func parseGender(s *string) (db.NullGenderEnum, error) {
	if s == nil {
		return db.NullGenderEnum{}, nil
	}
	g := db.GenderEnum(*s)
	if !g.Valid() {
		return db.NullGenderEnum{}, errors.New("invalid gender")
	}
	return db.NullGenderEnum{GenderEnum: g, Valid: true}, nil
}

func dateOfBirthJSON(t sql.NullTime) *string {
	if !t.Valid {
		return nil
	}
	s := t.Time.Format(dateLayout)
	return &s
}

func genderJSON(g db.NullGenderEnum) *string {
	if !g.Valid {
		return nil
	}
	s := string(g.GenderEnum)
	return &s
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
