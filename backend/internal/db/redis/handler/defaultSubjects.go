package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) defaultSubjects(c *gin.Context, userId string) {
	fmt.Println("Default control endpoint hit")
	// Fetch all subjects for this user
	subjects, err := h.subjects.ListSubjectsForUser(c, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list subjects"})
		return
	}
	fmt.Printf("Listed subjects: %+v\n", subjects)

	if len(*subjects) == 0 {
		// If no subjects, add default subjects
		subjects, err = h.subjects.AddDefaultSubjectsToUser(c, userId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add default subjects"})
			return
		}
		fmt.Printf("Added default subjects: %+v\n", subjects)
	}

	c.JSON(http.StatusOK, gin.H{"action": "subscribe", "subjects": subjects, "durable": true})

}
