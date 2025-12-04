package v1

import (
	"app/internal/db/postgres/handlers/geo"

	"github.com/gin-gonic/gin"
)

func AddGeoRoutes(r *gin.RouterGroup) {
	geoGroup := r.Group("/geo")
	{
		geoGroup.GET("/countries", geo.ListCountries)
		geoGroup.GET("/countries/:country/states", geo.GetStatesByCountry)
		geoGroup.GET("/states/:state/cities", geo.SearchCitiesByStateId)
	}
}
