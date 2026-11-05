package communities

import (
	"app/internal/auth"
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
	"github.com/lib/pq"
)

type ChannelRequest struct {
	ChannelID   int64        `json:"channel_id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Thumbnail   string       `json:"thumbnail"`
	Visibility  string       `json:"visibility"`
	Theme       string       `json:"theme"`
	RequestedBy *PersonaView `json:"requested_by"`
	RequestedAt string       `json:"requested_at"`
}

// RequestChannel asks for channelID to join communityID. It answers an error
// code for the client, or "" when a pending request was stored.
func RequestChannel(ctx context.Context, q *db.Queries, communityID, channelID, personaID int64) (string, error) {
	live, err := q.GetLiveChannelCommunity(ctx, channelID)
	if err == nil {
		if live.Status == db.CommunityChannelStatusEnumActive {
			return "channel_in_community", nil
		}
		return "channel_request_pending", nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}
	_, err = q.RequestCommunityChannel(ctx, db.RequestCommunityChannelParams{
		CommunityID: communityID,
		ChannelID:   channelID,
		RequestedBy: sql.NullInt64{Int64: personaID, Valid: true},
	})
	if errors.Is(err, sql.ErrNoRows) {
		return "recently_rejected", nil
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "23505" {
		return "channel_request_pending", nil
	}
	return "", err
}

// PublishChannelRequest announces a stored channel_request change. recipientID
// is the persona that asked, for approvals and rejections.
func PublishChannelRequest(ctx context.Context, nh *nats.NatsHelper, communityID, actorID int64, action db.EventActionEnum, channelID int64, reason string, recipientID *int64) {
	stream := nats.CHANNEL_EVENTS_STREAM
	event := nats.EventChannelRequest
	subj := subject.New(&stream, &models.Owner{ID: communityID, Type: subject.OwnerTypeCommunity}, string(event), string(action)).GetSubject()
	message := &nats.MessageType{
		Event: nats.Event{
			Name:        event,
			Action:      action,
			TargetId:    strconv.FormatInt(communityID, 10),
			TargetType:  nats.TargetCommunity,
			Owner:       nats.OwnerCommunity,
			OwnerID:     communityID,
			ActorID:     actorID,
			RecipientID: recipientID,
			Timestamp:   time.Now().UnixMilli(),
		},
		Payload: nats.CommunityChannelPayload{ChannelID: channelID, Reason: reason},
	}
	if err := nh.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("Warning: failed to publish %s.%s for community %d: %v", event, action, communityID, err)
	}
}

// PublishChannelCommunity tells the channel's viewers its community row changed.
func PublishChannelCommunity(ctx context.Context, nh *nats.NatsHelper, channelID, actorID int64) {
	publishChannelUpdate(ctx, nh, channelID, actorID, nats.EventChannelCommunity)
}

func publishChannelUpdate(ctx context.Context, nh *nats.NatsHelper, channelID, actorID int64, event db.EventEnum) {
	stream := nats.CHANNEL_EVENTS_STREAM
	subj := subject.New(&stream, &models.Owner{ID: channelID, Type: models.OwnerTypeChannel}, string(event), string(db.EventActionEnumUpdate)).GetSubject()
	message := &nats.MessageType{Event: nats.Event{
		Name:       event,
		Action:     db.EventActionEnumUpdate,
		TargetId:   strconv.FormatInt(channelID, 10),
		TargetType: db.EventTargetTypeEnumCHANNEL,
		Owner:      db.OwnerEnumCHANNEL,
		OwnerID:    channelID,
		ActorID:    actorID,
		Timestamp:  time.Now().UnixMilli(),
	}}
	if err := nh.PublishMessage(ctx, subj, message); err != nil {
		log.Printf("Warning: failed to publish %s.update for channel %d: %v", event, channelID, err)
	}
}

// channelParams loads the community and the channel for a channel-side call.
func (h *Handler) channelParams(c *gin.Context) (int64, int64, access.Community, int64, access.Channel, bool) {
	personaID, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return 0, 0, access.Community{}, 0, access.Channel{}, false
	}
	communityID, ok := communityIDParam(c)
	if !ok {
		return 0, 0, access.Community{}, 0, access.Channel{}, false
	}
	community, ok := h.loadCommunity(c, communityID, personaID)
	if !ok {
		return 0, 0, access.Community{}, 0, access.Channel{}, false
	}
	channelID, err := strconv.ParseInt(c.Param("channel_id"), 10, 64)
	if err != nil || channelID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel ID"})
		return 0, 0, access.Community{}, 0, access.Channel{}, false
	}
	channel, err := access.LoadChannel(c.Request.Context(), h.q, channelID, personaID)
	if errors.Is(err, access.ErrChannelNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return 0, 0, access.Community{}, 0, access.Channel{}, false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return 0, 0, access.Community{}, 0, access.Channel{}, false
	}
	return personaID, communityID, community, channelID, channel, true
}

// requireChannelModerator answers 404 to non-readers and 403 to other non-moderators.
func requireChannelModerator(c *gin.Context, channel access.Channel) bool {
	if !channel.CanRead() {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return false
	}
	if !channel.CanModerate {
		c.JSON(http.StatusForbidden, gin.H{"error": "not_moderator"})
		return false
	}
	return true
}

func (h *Handler) RequestChannelJoin(c *gin.Context) {
	personaID, communityID, _, channelID, channel, ok := h.channelParams(c)
	if !ok || !requireChannelModerator(c, channel) {
		return
	}
	ctx := c.Request.Context()
	code, err := RequestChannel(ctx, h.q, communityID, channelID, personaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if code != "" {
		c.JSON(http.StatusConflict, gin.H{"error": code})
		return
	}
	PublishChannelRequest(ctx, h.nats, communityID, personaID, db.EventActionEnumCreate, channelID, nats.ReasonRequested, nil)
	PublishChannelCommunity(ctx, h.nats, channelID, personaID)
	c.JSON(http.StatusAccepted, gin.H{"status": "pending"})
}

func (h *Handler) CancelChannelRequest(c *gin.Context) {
	personaID, communityID, _, channelID, channel, ok := h.channelParams(c)
	if !ok || !requireChannelModerator(c, channel) {
		return
	}
	ctx := c.Request.Context()
	n, err := h.q.CancelCommunityChannelRequest(ctx, db.CancelCommunityChannelRequestParams{CommunityID: communityID, ChannelID: channelID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel request not found"})
		return
	}
	PublishChannelRequest(ctx, h.nats, communityID, personaID, db.EventActionEnumDelete, channelID, nats.ReasonCancelled, nil)
	PublishChannelCommunity(ctx, h.nats, channelID, personaID)
	c.JSON(http.StatusOK, gin.H{"status": "none"})
}

// RemoveChannel: the community's managers remove it, or the channel's moderators take it out.
func (h *Handler) RemoveChannel(c *gin.Context) {
	personaID, communityID, community, channelID, channel, ok := h.channelParams(c)
	if !ok {
		return
	}
	if !community.CanManage() && !requireChannelModerator(c, channel) {
		return
	}
	ctx := c.Request.Context()
	n, err := h.q.RemoveCommunityChannel(ctx, db.RemoveCommunityChannelParams{CommunityID: communityID, ChannelID: channelID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not in community"})
		return
	}
	Publish(ctx, h.nats, communityID, personaID, nats.EventCommunityChannels)
	PublishChannelCommunity(ctx, h.nats, channelID, personaID)
	c.JSON(http.StatusOK, gin.H{"status": "none"})
}

func (h *Handler) ListChannelRequests(c *gin.Context) {
	_, communityID, _, ok := h.requireManager(c)
	if !ok {
		return
	}
	rows, err := h.q.ListCommunityChannelRequests(c.Request.Context(), communityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var requesterIDs []int64
	for _, r := range rows {
		if r.RequestedBy.Valid {
			requesterIDs = append(requesterIDs, r.RequestedBy.Int64)
		}
	}
	viewerID, _ := auth.PersonaID(c)
	personas, err := h.q.ResolvePersonasForViewer(c.Request.Context(), db.ResolvePersonasForViewerParams{ViewerID: viewerID, Ids: requesterIDs})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	resolved := make(map[int64]db.ResolvePersonasForViewerRow, len(personas))
	for _, p := range personas {
		resolved[p.ID] = p
	}

	requests := make([]ChannelRequest, len(rows))
	for i, r := range rows {
		requests[i] = ChannelRequest{
			ChannelID:   r.ChannelID,
			Name:        r.Name,
			Description: r.Description,
			Thumbnail:   r.Thumbnail,
			Visibility:  string(r.Visibility),
			Theme:       string(r.Theme),
			RequestedAt: r.RequestedAt.Format(time.RFC3339),
		}
		if p, ok := resolved[r.RequestedBy.Int64]; ok && r.RequestedBy.Valid {
			view := PersonaView{PersonaID: p.ID, FirstName: p.FirstName, LastName: p.LastName, Thumbnail: p.Thumbnail.String}
			if !p.Visible {
				// The name the requester already has in its channel's People tab.
				view = PersonaView{PersonaID: p.ID, FirstName: access.AnonymousName(p.ID, r.ChannelID), Anonymous: true}
			}
			requests[i].RequestedBy = &view
		}
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

func (h *Handler) ApproveChannelRequest(c *gin.Context) {
	h.resolveChannelRequest(c, db.CommunityChannelStatusEnumActive)
}

func (h *Handler) RejectChannelRequest(c *gin.Context) {
	h.resolveChannelRequest(c, db.CommunityChannelStatusEnumRejected)
}

func (h *Handler) resolveChannelRequest(c *gin.Context, status db.CommunityChannelStatusEnum) {
	personaID, communityID, _, ok := h.requireManager(c)
	if !ok {
		return
	}
	channelID, err := strconv.ParseInt(c.Param("channel_id"), 10, 64)
	if err != nil || channelID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid channel ID"})
		return
	}

	ctx := c.Request.Context()
	requestedBy, err := h.q.ResolveCommunityChannelRequest(ctx, db.ResolveCommunityChannelRequestParams{Status: status, CommunityID: communityID, ChannelID: channelID})
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel request not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var recipient *int64
	if requestedBy.Valid {
		recipient = &requestedBy.Int64
	}

	reason := nats.ReasonRejected
	if status == db.CommunityChannelStatusEnumActive {
		reason = nats.ReasonApproved
	}
	PublishChannelRequest(ctx, h.nats, communityID, personaID, db.EventActionEnumDelete, channelID, reason, recipient)
	if status == db.CommunityChannelStatusEnumActive {
		Publish(ctx, h.nats, communityID, personaID, nats.EventCommunityChannels)
	}
	PublishChannelCommunity(ctx, h.nats, channelID, personaID)
	c.JSON(http.StatusOK, gin.H{"status": string(status)})
}
