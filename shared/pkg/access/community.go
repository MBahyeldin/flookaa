package access

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"shared/pkg/db"
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

// MembershipStatus is how a persona sees its own membership: a rejection reads as pending.
func MembershipStatus(s db.NullCommunityMembershipStatusEnum) string {
	if !s.Valid {
		return "none"
	}
	if s.CommunityMembershipStatusEnum == db.CommunityMembershipStatusEnumActive {
		return "active"
	}
	return "pending"
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
