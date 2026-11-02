package users

import (
	"app/internal/auth"
	"net/http"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

func (h *Handler) SetLanguage(c *gin.Context) {
	userId, ok := auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return
	}

	var input struct {
		Language string `json:"language"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_language"})
		return
	}
	lang, ok := parseLanguage(input.Language)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_language"})
		return
	}

	if err := h.q.SetUserLanguage(c.Request.Context(), db.SetUserLanguageParams{ID: userId, Language: lang}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update language"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"language": input.Language})
}

func parseLanguage(s string) (db.NullLanguageEnum, bool) {
	switch l := db.LanguageEnum(s); l {
	case db.LanguageEnumEn, db.LanguageEnumAr:
		return db.NullLanguageEnum{LanguageEnum: l, Valid: true}, true
	}
	return db.NullLanguageEnum{}, false
}

func languageJSON(l db.NullLanguageEnum) *string {
	if !l.Valid {
		return nil
	}
	s := string(l.LanguageEnum)
	return &s
}
