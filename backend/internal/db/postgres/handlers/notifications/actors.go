package notifications

import (
	"context"
	"log"
	"shared/pkg/access"
	"shared/pkg/db"
	"strconv"
)

type ActorResponse struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Thumbnail string `json:"thumbnail"`
	Anonymous bool   `json:"anonymous"`
}

type actor struct {
	ActorResponse
	visible bool
}

// resolveActors looks up the personas behind a page of notifications as the
// recipient may see them. A deleted persona is left out, and its
// notification shows without an actor.
func (h *Handler) resolveActors(ctx context.Context, recipientID int64, ids map[int64]struct{}) (map[int64]*actor, error) {
	actors := make(map[int64]*actor, len(ids))
	var misses []int64
	for id := range ids {
		cached, err := h.personas.GetPersonaInfo(ctx, strconv.FormatInt(id, 10))
		if err != nil {
			log.Println("redis get persona error:", err)
		}
		if cached == nil {
			misses = append(misses, id)
			continue
		}
		// The cache holds public personas only.
		actors[id] = &actor{ActorResponse{
			ID:        cached.ID,
			FirstName: cached.FirstName,
			LastName:  cached.LastName,
			Thumbnail: cached.Thumbnail.String,
		}, true}
	}
	if len(misses) == 0 {
		return actors, nil
	}

	rows, err := h.q.ResolvePersonasForViewer(ctx, db.ResolvePersonasForViewerParams{
		Ids:      misses,
		ViewerID: recipientID,
	})
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		_ = h.personas.SetPersonaInfo(ctx, &db.ResolvePersonaByIDRow{
			ID:        row.ID,
			FirstName: row.FirstName,
			LastName:  row.LastName,
			Thumbnail: row.Thumbnail,
			Bio:       row.Bio,
			Slug:      row.Slug,
			Privacy:   row.Privacy,
		})
		actors[row.ID] = &actor{ActorResponse{
			ID:        row.ID,
			FirstName: row.FirstName,
			LastName:  row.LastName,
			Thumbnail: row.Thumbnail.String,
		}, row.Visible}
	}
	return actors, nil
}

// view is the actor as shown in one notification: anonymous ones are named
// per wall for wall content, per community for community kinds, otherwise per
// channel, matching what the recipient sees there.
func (a *actor) view(channelID, communityID, wallID int64) *ActorResponse {
	if a.visible {
		r := a.ActorResponse
		return &r
	}
	name := access.AnonymousName(a.ID, channelID)
	if communityID != 0 {
		name = access.AnonymousCommunityName(a.ID, communityID)
	}
	if wallID != 0 {
		name = access.AnonymousWallName(a.ID, wallID)
	}
	return &ActorResponse{ID: a.ID, FirstName: name, Anonymous: true}
}
