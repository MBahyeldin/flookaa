// Package notifications holds per-kind notification behaviour shared by the
// notifier (which writes rows) and the backend API (which reads them), so the
// two can't disagree about what a kind is about or how it is counted.
//
// The kinds themselves are the Postgres notification_kind_enum. A kind added
// by a migration also needs an entry in Kinds; Check fails at startup until
// it has one.
package notifications

import (
	"context"
	"fmt"
	"shared/pkg/db"
	"strconv"
)

// Count is the recount of one aggregated notification: how many personas
// other than the recipient are behind it, and the most recent of them.
type Count struct {
	Count         int64
	LatestActorID int64
}

// RecountFunc recounts notifications of one kind for one recipient, batched
// by subject id. A subject missing from the result has a count of zero.
type RecountFunc func(ctx context.Context, q *db.Queries, recipientID int64, subjectIDs []string) (map[string]Count, error)

// Kind is what the code knows about a notification kind.
type Kind struct {
	// Subject is what every notification of this kind is about; its
	// subject_id is the id of that thing.
	Subject db.NotificationSubjectEnum
	// Recount counts the actors of an aggregated kind. Nil means the kind
	// has a single actor (the row's actor_id) and is never removed by a
	// recount.
	Recount RecountFunc
}

var Kinds = map[db.NotificationKindEnum]Kind{
	db.NotificationKindEnumPostComment:           {Subject: db.NotificationSubjectEnumPOST, Recount: recountCommenters},
	db.NotificationKindEnumCommentReply:          {Subject: db.NotificationSubjectEnumCOMMENT, Recount: recountCommenters},
	db.NotificationKindEnumPostLike:              {Subject: db.NotificationSubjectEnumPOST, Recount: recountLikers},
	db.NotificationKindEnumCommentLike:           {Subject: db.NotificationSubjectEnumCOMMENT, Recount: recountLikers},
	db.NotificationKindEnumJoinRequest:           {Subject: db.NotificationSubjectEnumCHANNEL, Recount: recountPendingJoinRequests},
	db.NotificationKindEnumRequestApproved:       {Subject: db.NotificationSubjectEnumCHANNEL},
	db.NotificationKindEnumRemovedFromChannel:    {Subject: db.NotificationSubjectEnumCHANNEL},
	db.NotificationKindEnumNewFollower:           {Subject: db.NotificationSubjectEnumPERSONA, Recount: recountFollowers},
	db.NotificationKindEnumFollowRequest:         {Subject: db.NotificationSubjectEnumPERSONA, Recount: recountPendingFollowRequests},
	db.NotificationKindEnumFollowRequestApproved: {Subject: db.NotificationSubjectEnumPERSONA},
	// The subject is the inviter, and the invitee for an accepted invitation.
	db.NotificationKindEnumFollowInvitation:         {Subject: db.NotificationSubjectEnumPERSONA},
	db.NotificationKindEnumFollowInvitationAccepted: {Subject: db.NotificationSubjectEnumPERSONA},
	db.NotificationKindEnumChannelRequest:           {Subject: db.NotificationSubjectEnumCOMMUNITY, Recount: recountPendingChannelRequests},
	// One row per community and requester; data.channel_id names the channel.
	db.NotificationKindEnumChannelRequestApproved: {Subject: db.NotificationSubjectEnumCOMMUNITY},
	db.NotificationKindEnumChannelRequestRejected: {Subject: db.NotificationSubjectEnumCOMMUNITY},
}

// GroupKey names the thing a notification is about, e.g. "post_like:<post
// id>" or "join_request:<channel id>". Repeated activity on it updates one
// row per recipient.
func GroupKey(kind db.NotificationKindEnum, subjectID string) string {
	return string(kind) + ":" + subjectID
}

// Lookup returns the spec of kind, or an error for a kind with none.
func Lookup(kind db.NotificationKindEnum) (Kind, error) {
	k, ok := Kinds[kind]
	if !ok {
		return Kind{}, fmt.Errorf("notifications: no spec for kind %q", kind)
	}
	return k, nil
}

// Check fails when the database has a notification kind without a spec, e.g.
// after a migration added one and the code was not updated.
func Check(ctx context.Context, q *db.Queries) error {
	kinds, err := q.ListNotificationKinds(ctx)
	if err != nil {
		return fmt.Errorf("notifications: list kinds: %w", err)
	}
	var missing []string
	for _, kind := range kinds {
		if _, ok := Kinds[db.NotificationKindEnum(kind)]; !ok {
			missing = append(missing, kind)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("notifications: kinds without a spec in shared/pkg/notifications: %v", missing)
	}
	return nil
}

func recountCommenters(ctx context.Context, q *db.Queries, recipientID int64, subjectIDs []string) (map[string]Count, error) {
	rows, err := q.RecountCommenters(ctx, db.RecountCommentersParams{TargetIds: subjectIDs, RecipientID: recipientID})
	if err != nil {
		return nil, err
	}
	counts := make(map[string]Count, len(rows))
	for _, r := range rows {
		counts[r.TargetID] = Count{Count: r.Count, LatestActorID: r.LatestActorID}
	}
	return counts, nil
}

func recountLikers(ctx context.Context, q *db.Queries, recipientID int64, subjectIDs []string) (map[string]Count, error) {
	rows, err := q.RecountLikers(ctx, db.RecountLikersParams{ObjectIds: subjectIDs, RecipientID: recipientID})
	if err != nil {
		return nil, err
	}
	counts := make(map[string]Count, len(rows))
	for _, r := range rows {
		counts[r.ObjectID] = Count{Count: r.Count, LatestActorID: r.LatestActorID}
	}
	return counts, nil
}

// recountPendingJoinRequests: the subject is the channel, so subject ids are
// channel ids.
func recountPendingJoinRequests(ctx context.Context, q *db.Queries, recipientID int64, subjectIDs []string) (map[string]Count, error) {
	channelIDs, err := parseIDs(subjectIDs)
	if err != nil {
		return nil, err
	}
	rows, err := q.RecountPendingJoinRequests(ctx, db.RecountPendingJoinRequestsParams{ChannelIds: channelIDs, RecipientID: recipientID})
	if err != nil {
		return nil, err
	}
	counts := make(map[string]Count, len(rows))
	for _, r := range rows {
		counts[strconv.FormatInt(r.ChannelID, 10)] = Count{Count: r.Count, LatestActorID: r.LatestActorID}
	}
	return counts, nil
}

// recountFollowers: the subject is the followed persona.
func recountFollowers(ctx context.Context, q *db.Queries, recipientID int64, subjectIDs []string) (map[string]Count, error) {
	personaIDs, err := parseIDs(subjectIDs)
	if err != nil {
		return nil, err
	}
	rows, err := q.RecountFollowers(ctx, db.RecountFollowersParams{PersonaIds: personaIDs, RecipientID: recipientID})
	if err != nil {
		return nil, err
	}
	counts := make(map[string]Count, len(rows))
	for _, r := range rows {
		counts[strconv.FormatInt(r.PersonaID, 10)] = Count{Count: r.Count, LatestActorID: r.LatestActorID}
	}
	return counts, nil
}

// recountPendingFollowRequests: the subject is the persona being asked.
func recountPendingFollowRequests(ctx context.Context, q *db.Queries, recipientID int64, subjectIDs []string) (map[string]Count, error) {
	personaIDs, err := parseIDs(subjectIDs)
	if err != nil {
		return nil, err
	}
	rows, err := q.RecountPendingFollowRequests(ctx, db.RecountPendingFollowRequestsParams{PersonaIds: personaIDs, RecipientID: recipientID})
	if err != nil {
		return nil, err
	}
	counts := make(map[string]Count, len(rows))
	for _, r := range rows {
		counts[strconv.FormatInt(r.PersonaID, 10)] = Count{Count: r.Count, LatestActorID: r.LatestActorID}
	}
	return counts, nil
}

// recountPendingChannelRequests: the subject is the community. A recipient
// that no longer manages it counts zero.
func recountPendingChannelRequests(ctx context.Context, q *db.Queries, recipientID int64, subjectIDs []string) (map[string]Count, error) {
	communityIDs, err := parseIDs(subjectIDs)
	if err != nil {
		return nil, err
	}
	rows, err := q.RecountPendingChannelRequests(ctx, db.RecountPendingChannelRequestsParams{CommunityIds: communityIDs, RecipientID: recipientID})
	if err != nil {
		return nil, err
	}
	counts := make(map[string]Count, len(rows))
	for _, r := range rows {
		counts[strconv.FormatInt(r.CommunityID, 10)] = Count{Count: r.Count, LatestActorID: r.LatestActorID}
	}
	return counts, nil
}

// parseIDs reads subject ids of kinds whose subjects have numeric ids.
func parseIDs(subjectIDs []string) ([]int64, error) {
	ids := make([]int64, 0, len(subjectIDs))
	for _, s := range subjectIDs {
		id, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("notifications: subject id %q: %w", s, err)
		}
		ids = append(ids, id)
	}
	return ids, nil
}
