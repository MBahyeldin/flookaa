// Package access holds the channel access rules shared by REST, GraphQL and
// /control, so every entry point answers "may this persona do X" the same way.
//
//	              public channel   private channel
//	see metadata  everyone         everyone (so they can request to join)
//	read content  everyone         active members
//	subscribe     everyone         active members
//	post/comment/ active members   active members
//	like
package access

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"shared/pkg/db"
)

// ErrChannelNotFound is returned for missing channels and for private
// channels the persona may not read, so callers can't tell the two apart.
var ErrChannelNotFound = errors.New("channel not found")

// ErrNotMember is returned when a persona that can read a channel tries to
// write to it without being an active member.
var ErrNotMember = errors.New("join the channel first")

type Channel struct {
	db.GetChannelAccessRow
}

// LoadChannel returns what personaID may do in channelID, or
// ErrChannelNotFound when the channel does not exist.
func LoadChannel(ctx context.Context, q *db.Queries, channelID, personaID int64) (Channel, error) {
	row, err := q.GetChannelAccess(ctx, db.GetChannelAccessParams{
		ChannelID: channelID,
		PersonaID: personaID,
	})
	if errors.Is(err, sql.ErrNoRows) {
		return Channel{}, ErrChannelNotFound
	}
	if err != nil {
		return Channel{}, fmt.Errorf("load channel access: %w", err)
	}
	return Channel{row}, nil
}

func (c Channel) IsPrivate() bool {
	return c.Visibility == db.ChannelVisibilityEnumPrivate
}

// CanRead: posts, comments and realtime events.
func (c Channel) CanRead() bool {
	return !c.IsPrivate() || c.IsMember
}

// CanWrite: posting, commenting and liking.
func (c Channel) CanWrite() bool {
	return c.IsMember
}

// Read returns nil when the persona may read, otherwise ErrChannelNotFound.
func (c Channel) Read() error {
	if !c.CanRead() {
		return ErrChannelNotFound
	}
	return nil
}

// Write returns nil when the persona may write. Personas that cannot even
// read get ErrChannelNotFound, readers that are not members get ErrNotMember.
func (c Channel) Write() error {
	if err := c.Read(); err != nil {
		return err
	}
	if !c.CanWrite() {
		return ErrNotMember
	}
	return nil
}
