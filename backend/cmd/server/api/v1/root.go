package v1

import (
	"app/internal/db/postgres/handlers/channels"
	"app/internal/db/postgres/handlers/followers"
	"app/internal/db/postgres/handlers/geo"
	"app/internal/db/postgres/handlers/interests"
	"app/internal/db/postgres/handlers/notifications"
	"app/internal/db/postgres/handlers/users"
	oauthproviders "app/internal/oauthproviders"
	"context"

	"github.com/gin-gonic/gin"
)

// Handlers are the REST handlers mounted under /api/v1.
type Handlers struct {
	Users         *users.Handler
	Channels      *channels.Handler
	Followers     *followers.Handler
	Geo           *geo.Handler
	Notifications *notifications.Handler
	Google        *oauthproviders.Google
	Interests     *interests.Handler
	IsAdmin       func(ctx context.Context, userID int64) (bool, error)
}

func AddV1Group(r *gin.RouterGroup, h Handlers) *gin.RouterGroup {
	v1Group := r.Group("/v1")
	AddAuthRoutes(v1Group, h.Users, h.Google)
	AddUsersRoutes(v1Group, h.Users)
	AddHealthRoutes(v1Group)
	AddGeoRoutes(v1Group, h.Geo)
	AddChannelsGroups(v1Group, h.Channels)
	AddPersonaRoutes(v1Group, h.Users, h.Followers, h.Interests)
	AddNotificationsRoutes(v1Group, h.Notifications)
	AddInterestsRoutes(v1Group, h.Interests, h.IsAdmin)
	return v1Group
}
