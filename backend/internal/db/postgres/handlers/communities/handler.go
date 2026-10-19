package communities

import (
	"app/internal/db/postgres/handlers/interests"
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"shared/external/db/nats"
	"shared/pkg/access"
	"shared/pkg/db"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

const maxCommunityInterests = 5

type Handler struct {
	pg   *sql.DB
	q    *db.Queries
	nats *nats.NatsHelper
}

func NewHandler(pg *sql.DB, q *db.Queries, nats *nats.NatsHelper) *Handler {
	return &Handler{pg: pg, q: q, nats: nats}
}

type InterestTag struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Emoji string `json:"emoji"`
}

type Owner struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Thumbnail string `json:"thumbnail"`
	Anonymous bool   `json:"anonymous"`
}

type Community struct {
	ID            int64         `json:"id"`
	Name          string        `json:"name"`
	Slug          string        `json:"slug"`
	Description   string        `json:"description"`
	Thumbnail     string        `json:"thumbnail"`
	Banner        string        `json:"banner"`
	Visibility    string        `json:"visibility"`
	Owner         *Owner        `json:"owner"`
	Interests     []InterestTag `json:"interests"`
	ChannelsCount int32         `json:"channels_count"`
	CanManage     bool          `json:"can_manage,omitempty"`
}

// Publish announces a stored change, so a failed publish is only logged.
func Publish(ctx context.Context, nh *nats.NatsHelper, communityID, actorID int64, event db.EventEnum) {
	stream := nats.CHANNEL_EVENTS_STREAM
	subj := subject.New(&stream, &models.Owner{ID: communityID, Type: subject.OwnerTypeCommunity}, string(event), string(db.EventActionEnumUpdate)).GetSubject()
	message := &nats.MessageType{Event: nats.Event{
		Name:       event,
		Action:     db.EventActionEnumUpdate,
		TargetId:   strconv.FormatInt(communityID, 10),
		TargetType: nats.TargetCommunity,
		Owner:      nats.OwnerCommunity,
		OwnerID:    communityID,
		ActorID:    actorID,
		Timestamp:  time.Now().UnixMilli(),
	}}
	if err := nh.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("Warning: failed to publish %s.update for community %d: %v", event, communityID, err)
	}
}

// loadCommunity writes 404 for a missing community and 500 for other errors.
func (h *Handler) loadCommunity(c *gin.Context, communityID, personaID int64) (access.Community, bool) {
	community, err := access.LoadCommunity(c.Request.Context(), h.q, communityID, personaID)
	if errors.Is(err, access.ErrCommunityNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return access.Community{}, false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return access.Community{}, false
	}
	return community, true
}

func communityIDParam(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("community_id"), 10, 64)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid community ID"})
		return 0, false
	}
	return id, true
}

// checkInterests returns an error code for the client, or "" when the ids may be saved.
// communityID 0 is a community being created, so only active interests pass.
func (h *Handler) checkInterests(ctx context.Context, communityID int64, ids []int64) (string, error) {
	if !interests.ValidIDs(ids, maxCommunityInterests) {
		return "invalid_interests", nil
	}
	allowed, err := h.q.CountAllowedCommunityInterests(ctx, db.CountAllowedCommunityInterestsParams{Ids: ids, CommunityID: communityID})
	if err != nil {
		return "", err
	}
	if int(allowed) != len(ids) {
		return "invalid_interest", nil
	}
	return "", nil
}

// row is the shape every community query returns.
type row struct {
	db.Community
	ChannelsCount int32
}

// build fills interests and owners for a page with one query each.
func (h *Handler) build(ctx context.Context, viewerID int64, rows []row) ([]Community, error) {
	out := make([]Community, len(rows))
	if len(rows) == 0 {
		return out, nil
	}
	ids := make([]int64, len(rows))
	ownerIDs := make([]int64, 0, len(rows))
	for i, r := range rows {
		ids[i] = r.ID
		ownerIDs = append(ownerIDs, r.OwnerID)
	}

	tags := make(map[int64][]InterestTag, len(ids))
	interestRows, err := h.q.ListCommunityInterests(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, t := range interestRows {
		tags[t.CommunityID] = append(tags[t.CommunityID], InterestTag{ID: t.ID, Name: t.Name, Slug: t.Slug, Emoji: t.Emoji})
	}

	owners := make(map[int64]*Owner, len(ownerIDs))
	personas, err := h.q.ResolvePersonasForViewer(ctx, db.ResolvePersonasForViewerParams{ViewerID: viewerID, Ids: ownerIDs})
	if err != nil {
		return nil, err
	}
	for _, p := range personas {
		if p.Visible {
			owners[p.ID] = &Owner{ID: p.ID, FirstName: p.FirstName, LastName: p.LastName, Thumbnail: p.Thumbnail.String}
		} else {
			owners[p.ID] = &Owner{ID: p.ID, FirstName: access.AnonymousName(p.ID, 0), Anonymous: true}
		}
	}

	for i, r := range rows {
		tagList := tags[r.ID]
		if tagList == nil {
			tagList = []InterestTag{}
		}
		out[i] = Community{
			ID:            r.ID,
			Name:          r.Name,
			Slug:          r.Slug,
			Description:   r.Description,
			Thumbnail:     r.Thumbnail,
			Banner:        r.Banner,
			Visibility:    string(r.Visibility),
			Owner:         owners[r.OwnerID],
			Interests:     tagList,
			ChannelsCount: r.ChannelsCount,
		}
	}
	return out, nil
}

// writeOne answers {community} for id, as personaID sees it.
func (h *Handler) writeOne(c *gin.Context, id, personaID int64, status int) {
	ctx := c.Request.Context()
	r, err := h.q.GetCommunityByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.writeRow(c, row{r.Community, r.ChannelsCount}, personaID, status)
}

func (h *Handler) writeRow(c *gin.Context, r row, personaID int64, status int) {
	ctx := c.Request.Context()
	community, err := access.LoadCommunity(ctx, h.q, r.ID, personaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	built, err := h.build(ctx, personaID, []row{r})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	built[0].CanManage = community.CanManage
	c.JSON(status, gin.H{"community": built[0]})
}
