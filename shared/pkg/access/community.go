package access

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"shared/pkg/db"
	"time"
)

var ErrCommunityNotFound = errors.New("community not found")

// Every persona sees a community's metadata. Managing it (info, interests,
// rules, requests, members, channels in it) is CanManage; moderators and
// visibility are CanOwn.
type Community struct {
	db.GetCommunityAccessRow
}

func LoadCommunity(ctx context.Context, q *db.Queries, communityID, personaID int64) (Community, error) {
	row, err := q.GetCommunityAccess(ctx, db.GetCommunityAccessParams{
		CommunityID: communityID,
		PersonaID:   personaID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return Community{}, ErrCommunityNotFound
	}
	if err != nil {
		return Community{}, fmt.Errorf("load community access: %w", err)
	}
	return Community{row}, nil
}

func (c Community) IsPrivate() bool {
	return c.Visibility == db.CommunityVisibilityEnumPrivate
}

func (c Community) IsMember() bool {
	return c.MembershipStatus.Valid && c.MembershipStatus.CommunityMembershipStatusEnum == db.CommunityMembershipStatusEnumActive
}

// RejectionCooldown is how long a rejected persona can't ask again.
const RejectionCooldown = 7 * 24 * time.Hour

// RejectedUntil is when a rejection's cooldown ends, or nil when the row isn't
// a rejection inside it.
func RejectedUntil(s db.NullCommunityMembershipStatusEnum, resolvedAt sql.NullTime) *time.Time {
	if !s.Valid || s.CommunityMembershipStatusEnum != db.CommunityMembershipStatusEnumRejected || !resolvedAt.Valid {
		return nil
	}
	until := resolvedAt.Time.Add(RejectionCooldown)
	if !time.Now().Before(until) {
		return nil
	}
	return &until
}

// MembershipStatus is how a persona sees its own membership: none, pending,
// active, or rejected while the cooldown runs.
func MembershipStatus(s db.NullCommunityMembershipStatusEnum, resolvedAt sql.NullTime) string {
	if !s.Valid {
		return "none"
	}
	switch s.CommunityMembershipStatusEnum {
	case db.CommunityMembershipStatusEnumActive:
		return "active"
	case db.CommunityMembershipStatusEnumPending:
		return "pending"
	}
	if RejectedUntil(s, resolvedAt) != nil {
		return "rejected"
	}
	return "none"
}

// CanSeeInside: who may list a community's members and, on its page, its channels.
func (c Community) CanSeeInside() bool {
	return !c.IsPrivate() || c.IsMember() || c.CanManage()
}

func (c Community) CanOwn() bool {
	return c.IsOwner || c.IsAdmin
}

func (c Community) CanManage() bool {
	return c.CanOwn() || c.IsModerator
}
