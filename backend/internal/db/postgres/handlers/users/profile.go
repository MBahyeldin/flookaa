package users

import (
	"app/internal/models"
	"app/util/token"
	"database/sql"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
)

func GetProfile(c *gin.Context) {
	ctx := c.Request.Context()

	userId, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	q := db.New(postgres.DbConn)

	user, err := q.GetUserProfile(ctx, userId.(int64))

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":            user.ID,
		"name":          user.FirstName + " " + user.LastName,
		"email_address": user.EmailAddress,
		"phone":         user.Phone,
		"is_verified":   user.IsVerified.Bool,
		"thumbnail":     user.Thumbnail.String,
		"first_name":    user.FirstName,
		"last_name":     user.LastName,
		"bio":           user.Bio.String,
		"city_id":       user.CityID.Int64,
		"country_id":    user.CountryID.Int64,
		"state_id":      user.StateID.Int64,
		"postal_code":   user.PostalCode.String,
	})
}

// patch update /user/profile
func UpdateProfile(c *gin.Context) {
	jwtCookie, err := c.Cookie("jwt")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	token, err := token.Verify(jwtCookie)
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := token.Claims.(jwt.MapClaims)

	userId := int64(claims["user_id"].(float64))

	var input models.PatchUserRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	q := db.New(postgres.DbConn)
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
		Phone:          getStringOrDefault(input.Phone, currentUser.Phone),
		EmailAddress:   getStringOrDefault(input.EmailAddress, currentUser.EmailAddress),
		HashedPassword: getStringOrDefault(input.HashedPassword, currentUser.HashedPassword),
		Thumbnail:      sql.NullString{String: input.Thumbnail, Valid: input.Thumbnail != ""},
		Bio:            sql.NullString{String: input.Bio, Valid: true},
		CityID:         parseNullableInt64(input.CityID),
		CountryID:      parseNullableInt64(input.CountryID),
		StateID:        parseNullableInt64(input.StateID),
		PostalCode:     sql.NullString{String: input.PostalCode, Valid: input.PostalCode != ""},
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
