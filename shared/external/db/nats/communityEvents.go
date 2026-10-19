package nats

import "shared/pkg/db"

// Community events go to CHANNEL_EVENTS_STREAM as {stream}.COMMUNITY.{id}.{event}.update,
// NATS-only with no payload; viewers refetch.
const (
	// info.update: name, slug, description, images, visibility or interests changed.
	EventCommunityInfo db.EventEnum = "info"
	// channels.update: a channel was added to the community.
	EventCommunityChannels db.EventEnum = "channels"
	// counts.update: the member or follower count changed.
	EventCommunityCounts db.EventEnum = "counts"
)

// Membership changes reuse EventMember, EventFollower and EventJoinRequest with
// a ChannelEventPayload, as {stream}.COMMUNITY.{id}.{event}.{create|delete}.

// Not Postgres owner/target values: community events are never rows in events.
const (
	OwnerCommunity  db.OwnerEnum           = "COMMUNITY"
	TargetCommunity db.EventTargetTypeEnum = "COMMUNITY"
)
