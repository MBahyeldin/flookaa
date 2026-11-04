package channels

import (
	"app/internal/auth"
	"app/internal/logo"
	"database/sql"
	"errors"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

// Absent fields are left as they are; theme "" goes back to the community's.
type UpdateChannelRequest struct {
	Theme        *string `json:"theme"`
	CoverPattern *string `json:"cover_pattern"`
	Thumbnail    *string `json:"thumbnail"`
	Banner       *string `json:"banner"`
	BannerX      *int    `json:"banner_x"`
	BannerY      *int    `json:"banner_y"`
	Name         *string `json:"name"`
	Description  *string `json:"description"`
}

func validChannelName(name string) bool {
	return name != "" && utf8.RuneCountInString(name) <= 100
}

func validChannelDescription(description string) bool {
	return utf8.RuneCountInString(description) <= 500
}

func (h *Handler) UpdateChannel(c *gin.Context) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	channelId, ok := channelIDParam(c)
	if !ok {
		return
	}
	channel, ok := h.loadChannel(c, channelId, personaId)
	if !ok {
		return
	}
	if !channel.CanModerate {
		if !channel.CanRead() {
			c.JSON(http.StatusNotFound, gin.H{"error": access.ErrChannelNotFound.Error()})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "not_moderator"})
		return
	}
	var req UpdateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Name != nil {
		trimmed := strings.TrimSpace(*req.Name)
		req.Name = &trimmed
		if !validChannelName(trimmed) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_name"})
			return
		}
	}
	if req.Description != nil {
		trimmed := strings.TrimSpace(*req.Description)
		req.Description = &trimmed
		if !validChannelDescription(trimmed) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_description"})
			return
		}
	}
	if req.CoverPattern != nil && *req.CoverPattern == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_cover_pattern"})
		return
	}
	if code := checkLook(deref(req.Theme), deref(req.CoverPattern), deref(req.Thumbnail), deref(req.Banner)); code != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": code})
		return
	}
	if !logo.ValidPosition(req.BannerX) || !logo.ValidPosition(req.BannerY) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_cover_position"})
		return
	}

	params := db.UpdateChannelParams{ID: channelId}
	if req.Theme != nil {
		params.ClearTheme = *req.Theme == ""
		params.Theme = db.NullThemeEnum{ThemeEnum: db.ThemeEnum(*req.Theme), Valid: *req.Theme != ""}
	}
	if req.CoverPattern != nil {
		params.CoverPattern = db.NullCoverPatternEnum{CoverPatternEnum: db.CoverPatternEnum(*req.CoverPattern), Valid: true}
	}
	if req.Thumbnail != nil {
		params.Thumbnail = sql.NullString{String: *req.Thumbnail, Valid: true}
	}
	if req.Banner != nil {
		params.Banner = sql.NullString{String: *req.Banner, Valid: true}
	}
	params.BannerX = logo.NullPosition(req.BannerX)
	params.BannerY = logo.NullPosition(req.BannerY)
	if req.Name != nil {
		params.Name = sql.NullString{String: *req.Name, Valid: true}
	}
	if req.Description != nil {
		params.Description = sql.NullString{String: *req.Description, Valid: true}
	}
	ctx := c.Request.Context()
	updated, err := h.q.UpdateChannel(ctx, params)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": access.ErrChannelNotFound.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.publish(ctx, channelId, personaId, nats.EventChannelInfo, db.EventActionEnumUpdate, 0, "")
	c.JSON(http.StatusOK, gin.H{
		"theme":         updated.EffectiveTheme,
		"own_theme":     ownTheme(updated.Theme),
		"cover_pattern": updated.CoverPattern,
		"thumbnail":     updated.Thumbnail,
		"banner":        updated.Banner,
		"banner_x":      updated.BannerX,
		"banner_y":      updated.BannerY,
		"name":          updated.Name,
		"description":   updated.Description,
	})
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// nil when the channel takes its community's theme.
func ownTheme(t db.NullThemeEnum) *db.ThemeEnum {
	if !t.Valid {
		return nil
	}
	return &t.ThemeEnum
}
