package notifications

import (
	"context"
	"encoding/json"
	"shared/pkg/db"
	sharednotifications "shared/pkg/notifications"
	"strconv"
)

type ChannelResponse struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Thumbnail string `json:"thumbnail"`
}

// channelID is the channel a notification belongs to: its scope for content
// kinds, its subject for membership kinds, data.channel_id for community
// kinds. Zero for none.
func channelID(row db.Notification) int64 {
	if row.ScopeType.Valid && row.ScopeType.NotificationScopeEnum == db.NotificationScopeEnumCHANNEL {
		return row.ScopeID.Int64
	}
	if row.SubjectType == db.NotificationSubjectEnumCHANNEL {
		id, _ := strconv.ParseInt(row.SubjectID, 10, 64)
		return id
	}
	if row.SubjectType == db.NotificationSubjectEnumCOMMUNITY && row.Data.Valid {
		var data sharednotifications.Data
		if json.Unmarshal(row.Data.RawMessage, &data) == nil {
			return data.ChannelID
		}
	}
	return 0
}

type CommunityResponse struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Thumbnail string `json:"thumbnail"`
}

func communityID(row db.Notification) int64 {
	if row.SubjectType != db.NotificationSubjectEnumCOMMUNITY {
		return 0
	}
	id, _ := strconv.ParseInt(row.SubjectID, 10, 64)
	return id
}

// resolveCommunities looks up a page's communities like resolveChannels.
func (h *Handler) resolveCommunities(ctx context.Context, ids map[int64]struct{}) (map[int64]*CommunityResponse, error) {
	communities := make(map[int64]*CommunityResponse, len(ids))
	if len(ids) == 0 {
		return communities, nil
	}
	list := make([]int64, 0, len(ids))
	for id := range ids {
		list = append(list, id)
	}
	rows, err := h.q.ListCommunitySummaries(ctx, list)
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		communities[r.ID] = &CommunityResponse{ID: r.ID, Name: r.Name, Slug: r.Slug, Thumbnail: r.Thumbnail}
	}
	return communities, nil
}

// resolveChannels looks up the names of a page's channels. Names can be
// edited, so they are read now rather than stored with the notification. A
// deleted channel is left out.
func (h *Handler) resolveChannels(ctx context.Context, ids map[int64]struct{}) (map[int64]*ChannelResponse, error) {
	channels := make(map[int64]*ChannelResponse, len(ids))
	if len(ids) == 0 {
		return channels, nil
	}
	list := make([]int64, 0, len(ids))
	for id := range ids {
		list = append(list, id)
	}
	rows, err := h.q.ListChannelSummaries(ctx, list)
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		channels[r.ID] = &ChannelResponse{ID: r.ID, Name: r.Name, Thumbnail: r.Thumbnail}
	}
	return channels, nil
}
