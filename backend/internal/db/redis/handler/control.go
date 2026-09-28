package handlers

import (
	"app/internal/auth"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"shared/external/db/redis"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WsMessageType string

const (
	WsMessageTypePing        WsMessageType = "PING"
	WsMessageTypeSubscribe   WsMessageType = "SUBSCRIBE"
	WsMessageTypeUnsubscribe WsMessageType = "UNSUBSCRIBE"
)

type WsMessage struct {
	Type    WsMessageType `json:"type"`
	Payload Payload       `json:"payload"`
	ID      string        `json:"id"`
}

type OwnerType string

const (
	OwnerTypeChannel OwnerType = "CHANNEL"
	OwnerTypeDefault OwnerType = "DEFAULT"
)

type Payload struct {
	Event       string    `json:"event"`
	EventAction string    `json:"event_action"`
	Owner       OwnerType `json:"owner"`
	OwnerID     int64     `json:"owner_id"`
}

type Handler struct {
	subjects *redis.SubjectStore
}

func NewHandler(subjects *redis.SubjectStore) *Handler {
	return &Handler{subjects: subjects}
}

func (h *Handler) Control(c *gin.Context) {
	fmt.Println("Control endpoint hit")

	// Realtime subscriptions belong to the persona, not the user.
	personaIdInt64, ok := auth.PersonaID(c)
	if !ok {
		auth.PersonaRequired(c)
		return
	}

	var bodyData WsMessage
	if err := json.NewDecoder(c.Request.Body).Decode(&bodyData); err != nil {
		log.Printf("Failed to decode body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to decode body %v", err)})
		return
	}

	personaId := strconv.FormatInt(personaIdInt64, 10)

	switch bodyData.Payload.Owner {
	case OwnerTypeDefault:
		h.defaultSubjects(c, personaId)

	case OwnerTypeChannel:
		h.channel(c, bodyData)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid owner type %s", bodyData.Payload.Owner)})
		return
	}
}
