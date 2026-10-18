package interests

import (
	"app/internal/auth"
	"database/sql"
	"errors"
	"net/http"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

const maxPersonaInterests = 20

type PersonaInterests struct {
	Groups   []Group    `json:"groups"`
	Selected []int64    `json:"selected"`
	Retired  []Interest `json:"retired"`
}

func (h *Handler) PersonaInterests(c *gin.Context) {
	userID, personaID, ok := h.ownPersona(c)
	if !ok {
		return
	}
	h.writePersonaInterests(c, userID, personaID)
}

func (h *Handler) SetPersonaInterests(c *gin.Context) {
	userID, personaID, ok := h.ownPersona(c)
	if !ok {
		return
	}
	var in struct {
		InterestIDs []int64 `json:"interest_ids"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || !validIDs(in.InterestIDs) {
		badRequest(c, "invalid_interests")
		return
	}
	ctx := c.Request.Context()
	allowed, err := h.q.CountAllowedPersonaInterests(ctx, db.CountAllowedPersonaInterestsParams{Ids: in.InterestIDs, PersonaID: personaID})
	if err != nil {
		internalError(c, "persona interests check", err)
		return
	}
	if int(allowed) != len(in.InterestIDs) {
		badRequest(c, "invalid_interest")
		return
	}
	if err := h.q.ReplacePersonaInterests(ctx, db.ReplacePersonaInterestsParams{PersonaID: personaID, Ids: in.InterestIDs}); err != nil {
		internalError(c, "persona interests replace", err)
		return
	}
	h.writePersonaInterests(c, userID, personaID)
}

func (h *Handler) writePersonaInterests(c *gin.Context, userID, personaID int64) {
	ctx := c.Request.Context()
	rows, err := h.q.RankedActiveInterests(ctx, userID)
	if err != nil {
		internalError(c, "ranked list", err)
		return
	}
	mine, err := h.q.ListPersonaInterests(ctx, personaID)
	if err != nil {
		internalError(c, "persona interests", err)
		return
	}
	out := PersonaInterests{Groups: []Group{}, Selected: []int64{}, Retired: []Interest{}}
	for _, r := range rows {
		if len(out.Groups) == 0 || out.Groups[len(out.Groups)-1].ID != r.GroupID {
			out.Groups = append(out.Groups, Group{ID: r.GroupID, Name: r.GroupName, Slug: r.GroupSlug})
		}
		g := &out.Groups[len(out.Groups)-1]
		g.Interests = append(g.Interests, Interest{ID: r.ID, Name: r.Name, Slug: r.Slug, Emoji: r.Emoji})
	}
	for _, m := range mine {
		out.Selected = append(out.Selected, m.ID)
		if m.Retired {
			out.Retired = append(out.Retired, Interest{ID: m.ID, Name: m.Name, Slug: m.Slug, Emoji: m.Emoji})
		}
	}
	c.JSON(http.StatusOK, out)
}

// Any persona of the signed-in user, current or not.
func (h *Handler) ownPersona(c *gin.Context) (userID, personaID int64, ok bool) {
	userID, ok = auth.UserID(c)
	if !ok {
		auth.Unauthorized(c)
		return 0, 0, false
	}
	personaID, err := strconv.ParseInt(c.Param("persona_id"), 10, 64)
	if err != nil || personaID <= 0 {
		notYourPersona(c)
		return 0, 0, false
	}
	_, err = h.q.GetPersonaByIdAndUserId(c.Request.Context(), db.GetPersonaByIdAndUserIdParams{ID: personaID, UserID: userID})
	if errors.Is(err, sql.ErrNoRows) {
		notYourPersona(c)
		return 0, 0, false
	}
	if err != nil {
		internalError(c, "persona owner", err)
		return 0, 0, false
	}
	return userID, personaID, true
}

func validIDs(ids []int64) bool {
	if len(ids) == 0 || len(ids) > maxPersonaInterests {
		return false
	}
	seen := make(map[int64]bool, len(ids))
	for _, id := range ids {
		if id <= 0 || seen[id] {
			return false
		}
		seen[id] = true
	}
	return true
}

func notYourPersona(c *gin.Context) {
	c.JSON(http.StatusForbidden, gin.H{"error": "not_your_persona"})
}
