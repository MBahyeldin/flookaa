package geo

import (
	"database/sql"
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetStatesByCountry(c *gin.Context) {
	country := c.Param("country")

	if country == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Country parameter is required"})
		return
	}

	ctx := c.Request.Context()
	q := db.New(postgres.DbConn)

	countryId, err := strconv.ParseInt(country, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid country ID"})
		return
	}

	states, err := q.ListStatesByCountry(ctx, db.ListStatesByCountryParams{CountryID: sql.NullInt64{Int64: countryId, Valid: true}, Name: sql.NullString{Valid: false}})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch states"})
		return
	}

	statesResp := make([]State, len(states))

	for i := range states {
		statesResp[i] = State{
			ID:   states[i].ID,
			Name: states[i].Name,
		}
	}
	c.JSON(http.StatusOK, gin.H{"states": statesResp})
}

type State struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}
