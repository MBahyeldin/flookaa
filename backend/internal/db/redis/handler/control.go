package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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

func Control(c *gin.Context) {
	fmt.Println("Control endpoint hit")

	userIdInt64, exists := c.Get("user_id")
	if !exists {
		log.Println("User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	var bodyData WsMessage
	if err := json.NewDecoder(c.Request.Body).Decode(&bodyData); err != nil {
		log.Printf("Failed to decode body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to decode body %v", err)})
		return
	}

	userId := strconv.Itoa(int(userIdInt64.(int64)))

	switch bodyData.Payload.Owner {
	case OwnerTypeDefault:
		defaultSubjects(c, userId)

	case OwnerTypeChannel:
		channel(c, bodyData)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid owner type %s", bodyData.Payload.Owner)})
		return
	}
}
