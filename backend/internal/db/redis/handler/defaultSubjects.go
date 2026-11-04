package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) defaultSubjects(c *gin.Context, personaId string) {
	fmt.Println("Default control endpoint hit")
	subjects, err := h.subjects.EnsureDefaultSubjects(c, personaId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list subjects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": subjects, "durable": true})

}
