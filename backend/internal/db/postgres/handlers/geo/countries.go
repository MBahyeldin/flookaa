package geo

import (
	"net/http"
	"shared/external/db/postgres"
	"shared/pkg/db"

	"github.com/gin-gonic/gin"
)

type Country struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

func ListCountries(c *gin.Context) {
	ctx := c.Request.Context()
	q := db.New(postgres.DbConn)
	countries, err := q.ListCountries(ctx, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch countries"})
		return
	}

	countriesResp := make([]Country, len(countries))

	for i := range countries {
		countriesResp[i] = Country{
			ID:   countries[i].ID,
			Name: countries[i].Name,
		}
	}
	c.JSON(http.StatusOK, gin.H{"countries": countriesResp})
}
