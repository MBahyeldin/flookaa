package interests

import (
	"app/internal/slug"
	"context"
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

type Group struct {
	ID        int64      `json:"id"`
	Name      string     `json:"name"`
	Slug      string     `json:"slug"`
	Interests []Interest `json:"interests"`
}

type AdminInterest struct {
	Interest
	GroupID *int64 `json:"group_id"`
	Retired bool   `json:"retired"`
}

type AdminGroup struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

const (
	maxNameLen  = 100
	maxEmojiLen = 8
)

// List is the public catalogue: groups in order, each with its active interests.
func (h *Handler) List(c *gin.Context) {
	rows, err := h.q.ListActiveInterests(c.Request.Context())
	if err != nil {
		internalError(c, "list", err)
		return
	}
	out := []Group{}
	for _, r := range rows {
		if len(out) == 0 || out[len(out)-1].ID != r.GroupID {
			out = append(out, Group{ID: r.GroupID, Name: r.GroupName, Slug: r.GroupSlug})
		}
		g := &out[len(out)-1]
		g.Interests = append(g.Interests, Interest{ID: r.ID, Name: r.Name, Slug: r.Slug, Emoji: r.Emoji})
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) AdminList(c *gin.Context) {
	ctx := c.Request.Context()
	groups, err := h.q.ListInterestGroups(ctx)
	if err != nil {
		internalError(c, "admin list groups", err)
		return
	}
	rows, err := h.q.ListAllInterests(ctx)
	if err != nil {
		internalError(c, "admin list", err)
		return
	}
	outGroups := make([]AdminGroup, len(groups))
	for i, g := range groups {
		outGroups[i] = AdminGroup{ID: g.ID, Name: g.Name, Slug: g.Slug}
	}
	outInterests := make([]AdminInterest, len(rows))
	for i, r := range rows {
		outInterests[i] = adminInterest(r.ID, r.Name, r.Slug, r.Emoji, r.GroupID, r.Retired)
	}
	c.JSON(http.StatusOK, gin.H{"groups": outGroups, "interests": outInterests})
}

type interestInput struct {
	Name    *string `json:"name"`
	Slug    *string `json:"slug"`
	Emoji   *string `json:"emoji"`
	GroupID *int64  `json:"group_id"`
}

func (h *Handler) Create(c *gin.Context) {
	var in interestInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid_input")
		return
	}
	ctx := c.Request.Context()
	name, slugValue, emoji := deref(in.Name), deref(in.Slug), deref(in.Emoji)
	if code := validate(&name, slugValue, &emoji); code != "" {
		badRequest(c, code)
		return
	}
	if ok, err := h.groupExists(ctx, in.GroupID); err != nil {
		internalError(c, "group check", err)
		return
	} else if !ok {
		badRequest(c, "invalid_group")
		return
	}
	row, err := h.q.CreateInterest(ctx, db.CreateInterestParams{Name: name, Slug: slugValue, Emoji: emoji, GroupID: *in.GroupID})
	if code := conflict(err); code != "" {
		c.JSON(http.StatusConflict, gin.H{"error": code})
		return
	}
	if err != nil {
		internalError(c, "create", err)
		return
	}
	c.JSON(http.StatusCreated, adminInterest(row.ID, row.Name, row.Slug, row.Emoji, row.GroupID, row.Retired))
}

func (h *Handler) Update(c *gin.Context) {
	id, ok := pathID(c)
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
	groupID := in.GroupID
	if groupID == nil && cur.GroupID.Valid {
		groupID = &cur.GroupID.Int64
	}
	if code := validate(&name, slugValue, &emoji); code != "" {
		badRequest(c, code)
		return
	}
	if ok, err := h.groupExists(ctx, groupID); err != nil {
		internalError(c, "group check", err)
		return
	} else if !ok {
		badRequest(c, "invalid_group")
		return
	}

	row, err := h.q.UpdateInterest(ctx, db.UpdateInterestParams{ID: id, Name: name, Slug: slugValue, Emoji: emoji, GroupID: *groupID})
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
	c.JSON(http.StatusOK, adminInterest(row.ID, row.Name, row.Slug, row.Emoji, row.GroupID, row.Retired))
}

// Move swaps an interest with the nearest one in the same group and status,
// then renumbers everything, so ties can't get stuck.
func (h *Handler) Move(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	up, ok := direction(c)
	if !ok {
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
	same := func(r db.ListAllInterestsRow) bool {
		return r.Retired == rows[i].Retired && r.GroupID == rows[i].GroupID
	}
	step := 1
	if up {
		step = -1
	}
	for j := i + step; j >= 0 && j < len(rows); j += step {
		if same(rows[j]) {
			rows[i], rows[j] = rows[j], rows[i]
			break
		}
	}

	ids := make([]int64, len(rows))
	orders := make([]int32, len(rows))
	for k, r := range rows {
		ids[k], orders[k] = r.ID, int32(k+1)
	}
	if err := h.q.SetInterestOrders(ctx, db.SetInterestOrdersParams{Ids: ids, Orders: orders}); err != nil {
		internalError(c, "move", err)
		return
	}
	h.AdminList(c)
}

func (h *Handler) Retire(c *gin.Context)  { h.setRetired(c, true) }
func (h *Handler) Restore(c *gin.Context) { h.setRetired(c, false) }

func (h *Handler) setRetired(c *gin.Context, retired bool) {
	id, ok := pathID(c)
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
	c.JSON(http.StatusOK, adminInterest(row.ID, row.Name, row.Slug, row.Emoji, row.GroupID, row.Retired))
}

type groupInput struct {
	Name *string `json:"name"`
	Slug *string `json:"slug"`
}

func (h *Handler) CreateGroup(c *gin.Context) {
	var in groupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid_input")
		return
	}
	name, slugValue := deref(in.Name), deref(in.Slug)
	if code := validateGroup(&name, slugValue); code != "" {
		badRequest(c, code)
		return
	}
	row, err := h.q.CreateInterestGroup(c.Request.Context(), db.CreateInterestGroupParams{Name: name, Slug: slugValue})
	if code := groupConflict(err); code != "" {
		c.JSON(http.StatusConflict, gin.H{"error": code})
		return
	}
	if err != nil {
		internalError(c, "create group", err)
		return
	}
	c.JSON(http.StatusCreated, AdminGroup{ID: row.ID, Name: row.Name, Slug: row.Slug})
}

func (h *Handler) UpdateGroup(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var in groupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		badRequest(c, "invalid_input")
		return
	}
	ctx := c.Request.Context()
	cur, err := h.q.GetInterestGroup(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		notFound(c)
		return
	}
	if err != nil {
		internalError(c, "get group", err)
		return
	}
	name, slugValue := cur.Name, cur.Slug
	if in.Name != nil {
		name = *in.Name
	}
	if in.Slug != nil {
		slugValue = *in.Slug
	}
	if code := validateGroup(&name, slugValue); code != "" {
		badRequest(c, code)
		return
	}
	row, err := h.q.UpdateInterestGroup(ctx, db.UpdateInterestGroupParams{ID: id, Name: name, Slug: slugValue})
	if code := groupConflict(err); code != "" {
		c.JSON(http.StatusConflict, gin.H{"error": code})
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		notFound(c)
		return
	}
	if err != nil {
		internalError(c, "update group", err)
		return
	}
	c.JSON(http.StatusOK, AdminGroup{ID: row.ID, Name: row.Name, Slug: row.Slug})
}

func (h *Handler) MoveGroup(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	up, ok := direction(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	groups, err := h.q.ListInterestGroups(ctx)
	if err != nil {
		internalError(c, "move groups list", err)
		return
	}
	i := -1
	for k, g := range groups {
		if g.ID == id {
			i = k
		}
	}
	if i < 0 {
		notFound(c)
		return
	}
	j := i + 1
	if up {
		j = i - 1
	}
	if j >= 0 && j < len(groups) {
		groups[i], groups[j] = groups[j], groups[i]
	}
	ids := make([]int64, len(groups))
	orders := make([]int32, len(groups))
	for k, g := range groups {
		ids[k], orders[k] = g.ID, int32(k+1)
	}
	if err := h.q.SetInterestGroupOrders(ctx, db.SetInterestGroupOrdersParams{Ids: ids, Orders: orders}); err != nil {
		internalError(c, "move group", err)
		return
	}
	h.AdminList(c)
}

func (h *Handler) groupExists(ctx context.Context, id *int64) (bool, error) {
	if id == nil {
		return false, nil
	}
	return h.q.InterestGroupExists(ctx, *id)
}

func direction(c *gin.Context) (up bool, ok bool) {
	var in struct {
		Direction string `json:"direction"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || (in.Direction != "up" && in.Direction != "down") {
		badRequest(c, "invalid_direction")
		return false, false
	}
	return in.Direction == "up", true
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

func validateGroup(name *string, slugValue string) string {
	*name = strings.TrimSpace(*name)
	if *name == "" || utf8.RuneCountInString(*name) > maxNameLen {
		return "invalid_name"
	}
	if !slug.Valid(slugValue) {
		return "invalid_slug"
	}
	return ""
}

func groupConflict(err error) string {
	switch {
	case postgres.IsUniqueViolation(err, "interest_groups_name_lower_key"):
		return "name_taken"
	case postgres.IsUniqueViolation(err, "interest_groups_slug_key"):
		return "slug_taken"
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

func adminInterest(id int64, name, slugValue, emoji string, groupID sql.NullInt64, retired bool) AdminInterest {
	a := AdminInterest{Interest: Interest{ID: id, Name: name, Slug: slugValue, Emoji: emoji}, Retired: retired}
	if groupID.Valid {
		a.GroupID = &groupID.Int64
	}
	return a
}

func pathID(c *gin.Context) (int64, bool) {
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
