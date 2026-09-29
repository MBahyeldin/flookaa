package nats

import "shared/pkg/db"

// Channel membership events. They go to CHANNEL_EVENTS_STREAM as
// {stream}.CHANNEL.{id}.{event}.{action}. /control subscribes a channel's
// websockets to them next to its content events, and any other consumer (a
// notification service, say) can filter e.g. STREAM_CHANNEL_EVENTS.CHANNEL.*.member.*.
//
// Unlike post/comment/like they are NATS-only: they are not rows in the
// Postgres events table (channel_members and channel_followers are the
// source of truth), so they are not values of the Postgres event_enum.
const (
	// member.create: joined a public channel, or a join request was
	// approved. member.delete: left, or was removed by a moderator.
	EventMember db.EventEnum = "member"
	// follower.create / follower.delete: followed / unfollowed.
	EventFollower db.EventEnum = "follower"
	// join_request.create: asked to join a private channel.
	// join_request.delete: approved, rejected, or cancelled by the requester.
	EventJoinRequest db.EventEnum = "join_request"
)

// Why a channel event happened; see ChannelEventPayload.Reason.
const (
	ReasonJoined     = "joined"
	ReasonApproved   = "approved"
	ReasonRejected   = "rejected"
	ReasonRequested  = "requested"
	ReasonCancelled  = "cancelled"
	ReasonLeft       = "left"
	ReasonRemoved    = "removed"
	ReasonFollowed   = "followed"
	ReasonUnfollowed = "unfollowed"
)

// ChannelEventPayload is the payload of member, follower and join_request
// events. PersonaID is the persona whose membership changed; the event's
// ActorID is who made the change (the same persona, or a moderator for
// approved/rejected/removed).
type ChannelEventPayload struct {
	PersonaID int64  `json:"persona_id"`
	Reason    string `json:"reason"`
}
