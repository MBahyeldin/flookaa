package nats

import "shared/pkg/db"

// Persona follow events. They go to USER_EVENTS_STREAM as
// {stream}.PERSONA.{followed}.{follower|follow_request}.{create|delete}.
// Like channel membership they are NATS-only; persona_followers is the
// source of truth. They reuse EventFollower and the Reason* values.
const EventFollowRequest db.EventEnum = "follow_request"

// FollowEventPayload is the payload of persona follow events. PersonaID is
// the follower; the event's ActorID is who made the change.
type FollowEventPayload struct {
	PersonaID int64  `json:"persona_id"`
	Reason    string `json:"reason"`
}

// follow_counts.update: a persona's followers or following count changed.
// It carries no payload, so viewers who may see the counts but not the
// followers can subscribe to it (see /control owner PERSONA).
const EventFollowCounts db.EventEnum = "follow_counts"
