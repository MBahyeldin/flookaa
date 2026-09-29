package notifications

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"strconv"
)

type ActorResponse struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Thumbnail string `json:"thumbnail"`
}

// resolveActors looks up the personas behind a page of notifications, from
// the Redis persona cache or Postgres. A deleted persona is left out, and its
// notification shows without an actor.
func (h *Handler) resolveActors(ctx context.Context, ids map[int64]struct{}) (map[int64]*ActorResponse, error) {
	actors := make(map[int64]*ActorResponse, len(ids))
	for id := range ids {
		cached, err := h.personas.GetPersonaInfo(ctx, strconv.FormatInt(id, 10))
		if err != nil {
			log.Println("redis get persona error:", err)
		}
		if cached == nil {
			persona, err := h.q.ResolvePersonaByID(ctx, id)
			if errors.Is(err, sql.ErrNoRows) {
				continue
			}
			if err != nil {
				return nil, err
			}
			cached = &persona
			_ = h.personas.SetPersonaInfo(ctx, &persona)
		}
		actors[id] = &ActorResponse{
			ID:        cached.ID,
			FirstName: cached.FirstName,
			LastName:  cached.LastName,
			Thumbnail: cached.Thumbnail.String,
		}
	}
	return actors, nil
}
