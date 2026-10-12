package nats

import "shared/pkg/db"

// Persona follow events. They go to USER_EVENTS_STREAM as
// {stream}.PERSONA.{followed}.{follower|follow_request}.{create|delete}.
// Like channel membership they are NATS-only; persona_followers is the
// source of truth. They reuse EventFollower and the Reason* values.
const EventFollowRequest db.EventEnum = "follow_request"

// follow_invitation goes to the invitee's subject,
// {stream}.PERSONA.{invitee}.follow_invitation.{create|delete}, with the
// inviter as the payload's PersonaID.
const EventFollowInvitation db.EventEnum = "follow_invitation"

const (
	ReasonInvited  = "invited"
	ReasonAccepted = "accepted"
)

// FollowEventPayload is the payload of persona follow events. PersonaID is
// the follower, or the inviter for follow_invitation; the event's ActorID is
// who made the change.
type FollowEventPayload struct {
	PersonaID int64  `json:"persona_id"`
	Reason    string `json:"reason"`
}

// follow_counts.update: a persona's followers or following count changed.
// It carries no payload, so viewers who may see the counts but not the
// followers can subscribe to it (see /control owner PERSONA).
const EventFollowCounts db.EventEnum = "follow_counts"
