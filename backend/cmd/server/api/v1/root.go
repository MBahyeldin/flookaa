package v1

import "github.com/gin-gonic/gin"

func AddV1Group(r *gin.RouterGroup) *gin.RouterGroup {
	v1Group := r.Group("/v1")
	AddAuthRoutes(v1Group)
	AddUsersRoutes(v1Group)
	AddHealthRoutes(v1Group)
	AddGeoRoutes(v1Group)
	AddChannelsGroups(v1Group)
	AddPersonaRoutes(v1Group)
	return v1Group
}
