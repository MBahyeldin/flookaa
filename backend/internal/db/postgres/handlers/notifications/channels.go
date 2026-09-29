package notifications

import (
	"context"
	"shared/pkg/db"
	"strconv"
)

type ChannelResponse struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Thumbnail string `json:"thumbnail"`
}

// channelID is the channel a notification belongs to: its scope for content
// kinds, its subject for membership kinds. Zero for neither.
func channelID(row db.Notification) int64 {
	if row.ScopeType.Valid && row.ScopeType.NotificationScopeEnum == db.NotificationScopeEnumCHANNEL {
		return row.ScopeID.Int64
	}
	if row.SubjectType == db.NotificationSubjectEnumCHANNEL {
		id, _ := strconv.ParseInt(row.SubjectID, 10, 64)
		return id
	}
	return 0
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
