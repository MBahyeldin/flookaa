package interests

import (
	"app/internal/slug"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	q *db.Queries
}

func NewHandler(q *db.Queries) *Handler {
	return &Handler{q: q}
}

type Interest struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Emoji string `json:"emoji"`
}

type AdminInterest struct {
	Interest
	Retired bool `json:"retired"`
}

const (
	maxNameLen  = 100
	maxEmojiLen = 8
)

// List is the public catalogue: active interests, in order.
func (h *Handler) List(c *gin.Context) {
	rows, err := h.q.ListActiveInterests(c.Request.Context())
	if err != nil {
		internalError(c, "list", err)
		return
	}
	out := make([]Interest, len(rows))
	for i, r := range rows {
		out[i] = Interest{ID: r.ID, Name: r.Name, Slug: r.Slug, Emoji: r.Emoji}
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) AdminList(c *gin.Context) {
	rows, err := h.q.ListAllInterests(c.Request.Context())
	if err != nil {
		internalError(c, "admin list", err)
		return
	}
	out := make([]AdminInterest, len(rows))
	for i, r := range rows {
		out[i] = adminInterest(r.ID, r.Name, r.Slug, r.Emoji, r.Retired)
	}
	c.JSON(http.StatusOK, out)
}

type interestInput struct {
	Name  *string `json:"name"`
	Slug  *string `json:"slug"`
	Emoji *string `json:"emoji"`
}

func (h *Handler) Create(c *gin.Context) {
	var in interestInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid_input")
		return
	}
	name, slugValue, emoji := deref(in.Name), deref(in.Slug), deref(in.Emoji)
	if code := validate(&name, slugValue, &emoji); code != "" {
		badRequest(c, code)
		return
	}
	row, err := h.q.CreateInterest(c.Request.Context(), db.CreateInterestParams{Name: name, Slug: slugValue, Emoji: emoji})
	if code := conflict(err); code != "" {
		c.JSON(http.StatusConflict, gin.H{"error": code})
		return
	}
	if err != nil {
		internalError(c, "create", err)
		return
	}
	c.JSON(http.StatusCreated, adminInterest(row.ID, row.Name, row.Slug, row.Emoji, row.Retired))
}

func (h *Handler) Update(c *gin.Context) {
	id, ok := interestID(c)
	if !ok {
		return
	}
	var in interestInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid_input")
		return
	}
	ctx := c.Request.Context()
	cur, err := h.q.GetInterest(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		notFound(c)
		return
	}
	if err != nil {
		internalError(c, "get", err)
		return
	}

	name, slugValue, emoji := cur.Name, cur.Slug, cur.Emoji
	if in.Name != nil {
		name = *in.Name
	}
	if in.Slug != nil {
		slugValue = *in.Slug
	}
	if in.Emoji != nil {
		emoji = *in.Emoji
	}
	if code := validate(&name, slugValue, &emoji); code != "" {
		badRequest(c, code)
		return
	}

	row, err := h.q.UpdateInterest(ctx, db.UpdateInterestParams{ID: id, Name: name, Slug: slugValue, Emoji: emoji})
	if code := conflict(err); code != "" {
		c.JSON(http.StatusConflict, gin.H{"error": code})
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		notFound(c)
		return
	}
	if err != nil {
		internalError(c, "update", err)
		return
	}
	c.JSON(http.StatusOK, adminInterest(row.ID, row.Name, row.Slug, row.Emoji, row.Retired))
}

// Move swaps an interest with its neighbour in its list (active or retired)
// and renumbers everything, so ties can't get stuck.
func (h *Handler) Move(c *gin.Context) {
	id, ok := interestID(c)
	if !ok {
		return
	}
	var in struct {
		Direction string `json:"direction"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || (in.Direction != "up" && in.Direction != "down") {
		badRequest(c, "invalid_direction")
		return
	}
	ctx := c.Request.Context()
	rows, err := h.q.ListAllInterests(ctx)
	if err != nil {
		internalError(c, "move list", err)
		return
	}
	i := -1
	for k, r := range rows {
		if r.ID == id {
			i = k
		}
	}
	if i < 0 {
		notFound(c)
		return
	}
	j := i - 1
	if in.Direction == "down" {
		j = i + 1
	}
	if j >= 0 && j < len(rows) && rows[j].Retired == rows[i].Retired {
		rows[i], rows[j] = rows[j], rows[i]
	}

	ids := make([]int64, len(rows))
	orders := make([]int32, len(rows))
	out := make([]AdminInterest, len(rows))
	for k, r := range rows {
		ids[k], orders[k] = r.ID, int32(k+1)
		out[k] = adminInterest(r.ID, r.Name, r.Slug, r.Emoji, r.Retired)
	}
	if err := h.q.SetInterestOrders(ctx, db.SetInterestOrdersParams{Ids: ids, Orders: orders}); err != nil {
		internalError(c, "move", err)
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Retire(c *gin.Context)  { h.setRetired(c, true) }
func (h *Handler) Restore(c *gin.Context) { h.setRetired(c, false) }

func (h *Handler) setRetired(c *gin.Context, retired bool) {
	id, ok := interestID(c)
	if !ok {
		return
	}
	row, err := h.q.SetInterestRetired(c.Request.Context(), db.SetInterestRetiredParams{ID: id, Retired: retired})
	if errors.Is(err, sql.ErrNoRows) {
		notFound(c)
		return
	}
	if err != nil {
		internalError(c, "retire", err)
		return
	}
	c.JSON(http.StatusOK, adminInterest(row.ID, row.Name, row.Slug, row.Emoji, row.Retired))
}

func validate(name *string, slugValue string, emoji *string) string {
	*name = strings.TrimSpace(*name)
	*emoji = strings.TrimSpace(*emoji)
	if *name == "" || utf8.RuneCountInString(*name) > maxNameLen {
		return "invalid_name"
	}
	if !slug.Valid(slugValue) {
		return "invalid_slug"
	}
	if *emoji == "" || utf8.RuneCountInString(*emoji) > maxEmojiLen {
		return "invalid_emoji"
	}
	return ""
}

func conflict(err error) string {
	switch {
	case postgres.IsUniqueViolation(err, "interests_name_lower_key"):
		return "name_taken"
	case postgres.IsUniqueViolation(err, "interests_slug_key"):
		return "slug_taken"
	}
	return ""
}

func adminInterest(id int64, name, slugValue, emoji string, retired bool) AdminInterest {
	return AdminInterest{Interest: Interest{ID: id, Name: name, Slug: slugValue, Emoji: emoji}, Retired: retired}
}

func interestID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		notFound(c)
		return 0, false
	}
	return id, true
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func badRequest(c *gin.Context, code string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": code})
}

func notFound(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{"error": "not_found"})
}

func internalError(c *gin.Context, op string, err error) {
	log.Printf("interests: %s: %v", op, err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "internal_error"})
}
