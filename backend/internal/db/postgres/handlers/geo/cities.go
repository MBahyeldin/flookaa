package geo

import (
	"database/sql"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

type City struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

func SearchCitiesByStateId(c *gin.Context) {
	stateIdParam := c.Param("state")
	stateId, err := strconv.ParseInt(stateIdParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state ID"})
		return
	}

	// get optional search query parameter
	searchQuery := c.Query("search")
	listCititesByStateParams := db.ListCitiesByStateParams{
		StateID: sql.NullInt64{Int64: stateId, Valid: true},
		Name:    sql.NullString{String: searchQuery, Valid: searchQuery != ""},
	}

	ctx := c.Request.Context()
	q := db.New(postgres.DbConn)
	cities, err := q.ListCitiesByState(ctx, listCititesByStateParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cities"})
		return
	}

	citiesResp := make([]City, len(cities))

	for i := range cities {
		citiesResp[i] = City{
			ID:   cities[i].ID,
			Name: cities[i].Name,
		}
	}
	c.JSON(http.StatusOK, gin.H{"cities": citiesResp})
}
