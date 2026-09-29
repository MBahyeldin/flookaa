package notifications

import (
	"app/internal/auth"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"shared/pkg/db"
	sharednotifications "shared/pkg/notifications"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	defaultPageSize = 20
	maxPageSize     = 50
)

type SubjectResponse struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

type ScopeResponse struct {
	Type string `json:"type"`
	ID   int64  `json:"id"`
}

type NotificationResponse struct {
	ID      int64           `json:"id"`
	Kind    string          `json:"kind"`
	Subject SubjectResponse `json:"subject"`
	// Scope is null for personal notifications (membership kinds).
	Scope       *ScopeResponse `json:"scope"`
	Count       int64          `json:"count"`
	LatestActor *ActorResponse `json:"latest_actor"`
	// Channel is the channel it belongs to (scope or subject), looked up at
	// read time because names change. Null for other kinds or a deleted one.
	Channel   *ChannelResponse `json:"channel"`
	Data      json.RawMessage  `json:"data,omitempty"`
	Read      bool             `json:"read"`
	UpdatedAt string           `json:"updated_at"`
}

// ListNotifications returns a page of the persona's notifications, newest
// first. Pass next_cursor back as ?cursor= for the next page; it is null on
// the last one.
func (h *Handler) ListNotifications(c *gin.Context) {
	personaId, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}
	ctx := c.Request.Context()

	pageSize := defaultPageSize
	if s := c.Query("limit"); s != "" {
		n, err := strconv.Atoi(s)
		if err != nil || n < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid limit"})
			return
		}
		pageSize = min(n, maxPageSize)
	}

	params := db.ListNotificationsParams{RecipientID: personaId, PageSize: int32(pageSize)}
	if s := c.Query("cursor"); s != "" {
		updatedAt, id, err := parseCursor(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid cursor"})
			return
		}
		params.CursorUpdatedAt = sql.NullTime{Time: updatedAt, Valid: true}
		params.CursorID = sql.NullInt64{Int64: id, Valid: true}
	}

	rows, err := h.q.ListNotifications(ctx, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// The cursor follows the rows read, not the rows shown: some may be
	// dropped below, and paging must not repeat or skip any.
	var nextCursor *string
	if len(rows) == pageSize {
		last := rows[len(rows)-1]
		s := formatCursor(last.UpdatedAt, last.ID)
		nextCursor = &s
	}

	counts, err := h.recount(c, personaId, rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	notifications := make([]NotificationResponse, 0, len(rows))
	actorIDs := make(map[int64]struct{})
	channelIDs := make(map[int64]struct{})
	for _, row := range rows {
		spec, err := sharednotifications.Lookup(row.Kind)
		if err != nil {
			// Can't happen after notifications.Check at startup.
			log.Println("notifications:", err)
			continue
		}

		n := NotificationResponse{
			ID:        row.ID,
			Kind:      string(row.Kind),
			Subject:   SubjectResponse{Type: string(row.SubjectType), ID: row.SubjectID},
			Read:      row.ReadAt.Valid,
			UpdatedAt: row.UpdatedAt.Format(time.RFC3339),
		}
		if row.ScopeType.Valid {
			n.Scope = &ScopeResponse{Type: string(row.ScopeType.NotificationScopeEnum), ID: row.ScopeID.Int64}
		}
		if row.Data.Valid {
			n.Data = row.Data.RawMessage
		}

		var actorID int64
		if spec.Recount != nil {
			count := counts[row.Kind][row.SubjectID]
			if count.Count == 0 {
				// Nobody left (unliked, request resolved) and the notifier
				// hasn't removed the row yet.
				continue
			}
			n.Count = count.Count
			actorID = count.LatestActorID
		} else {
			n.Count = 1
			actorID = row.ActorID.Int64
		}
		if actorID != 0 {
			actorIDs[actorID] = struct{}{}
			n.LatestActor = &ActorResponse{ID: actorID}
		}
		if id := channelID(row); id != 0 {
			channelIDs[id] = struct{}{}
			n.Channel = &ChannelResponse{ID: id}
		}
		notifications = append(notifications, n)
	}

	actors, err := h.resolveActors(ctx, actorIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	channels, err := h.resolveChannels(ctx, channelIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range notifications {
		if a := notifications[i].LatestActor; a != nil {
			notifications[i].LatestActor = actors[a.ID]
		}
		if ch := notifications[i].Channel; ch != nil {
			notifications[i].Channel = channels[ch.ID]
		}
	}

	c.JSON(http.StatusOK, gin.H{"notifications": notifications, "next_cursor": nextCursor})
}

// recount runs one batched recount per aggregated kind on the page.
func (h *Handler) recount(c *gin.Context, personaId int64, rows []db.Notification) (map[db.NotificationKindEnum]map[string]sharednotifications.Count, error) {
	subjects := make(map[db.NotificationKindEnum][]string)
	for _, row := range rows {
		subjects[row.Kind] = append(subjects[row.Kind], row.SubjectID)
	}

	counts := make(map[db.NotificationKindEnum]map[string]sharednotifications.Count, len(subjects))
	for kind, ids := range subjects {
		spec, err := sharednotifications.Lookup(kind)
		if err != nil || spec.Recount == nil {
			continue
		}
		kindCounts, err := spec.Recount(c.Request.Context(), h.q, personaId, ids)
		if err != nil {
			return nil, fmt.Errorf("recount %s: %w", kind, err)
		}
		counts[kind] = kindCounts
	}
	return counts, nil
}

// A cursor is "<updated_at in unix microseconds>_<id>". Postgres keeps
// microseconds, so the round trip is exact.
func formatCursor(updatedAt time.Time, id int64) string {
	return strconv.FormatInt(updatedAt.UnixMicro(), 10) + "_" + strconv.FormatInt(id, 10)
}

func parseCursor(s string) (time.Time, int64, error) {
	micros, idStr, ok := strings.Cut(s, "_")
	if !ok {
		return time.Time{}, 0, fmt.Errorf("malformed cursor %q", s)
	}
	us, err := strconv.ParseInt(micros, 10, 64)
	if err != nil {
		return time.Time{}, 0, err
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return time.Time{}, 0, err
	}
	return time.UnixMicro(us), id, nil
}
