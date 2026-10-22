package nats

import "shared/pkg/db"

// Community events go to CHANNEL_EVENTS_STREAM as {stream}.COMMUNITY.{id}.{event}.update,
// NATS-only with no payload; viewers refetch.
const (
	// info.update: name, slug, description, images, visibility or interests changed.
	EventCommunityInfo db.EventEnum = "info"
	// channels.update: a channel was added to or taken out of the community.
	EventCommunityChannels db.EventEnum = "channels"
	// counts.update: the member or follower count changed.
	EventCommunityCounts db.EventEnum = "counts"
)

// Membership changes reuse EventMember, EventFollower and EventJoinRequest with
// a ChannelEventPayload, as {stream}.COMMUNITY.{id}.{event}.{create|delete}.

// moderator.{create|delete}: a ChannelEventPayload like the membership events.
const EventModerator db.EventEnum = "moderator"

const (
	ReasonAppointed   = "appointed"
	ReasonSteppedDown = "stepped_down"
)

// channel_request.create: a channel asked to join. channel_request.delete:
// approved, rejected or cancelled. Payload CommunityChannelPayload.
const EventChannelRequest db.EventEnum = "channel_request"

// CommunityChannelPayload is the payload of channel_request events; the
// event's ActorID is who made the change.
type CommunityChannelPayload struct {
	ChannelID int64  `json:"channel_id"`
	Reason    string `json:"reason"`
}

// {stream}.CHANNEL.{id}.community.update, no payload: the channel's community
// row changed (requested, approved, rejected, cancelled, left or removed).
const EventChannelCommunity db.EventEnum = "community"

// Not Postgres owner/target values: community events are never rows in events.
const (
	OwnerCommunity  db.OwnerEnum           = "COMMUNITY"
	TargetCommunity db.EventTargetTypeEnum = "COMMUNITY"
)
