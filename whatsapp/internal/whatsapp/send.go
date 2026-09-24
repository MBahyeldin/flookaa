package whatsapp

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

// ErrNotOnWhatsApp means the recipient's number is not registered. WhatsApp
// does not error when you send to an unregistered number — the message simply
// goes nowhere — so this check is the only way a caller can learn about it.
var ErrNotOnWhatsApp = errors.New("recipient is not registered on whatsapp")

// SendResult describes an accepted message.
type SendResult struct {
	ID        string    `json:"id"`
	To        string    `json:"to"`
	Timestamp time.Time `json:"timestamp"`
}

// SendText delivers a plain text message to a normalized E.164 number (digits
// only, no "+").
//
// messageID is optional. When supplied it is used as the WhatsApp message ID,
// which makes retries idempotent: WhatsApp deduplicates by ID, so re-sending
// after an ambiguous timeout cannot deliver the message twice.
func (s *Service) SendText(ctx context.Context, digits, text, messageID string) (SendResult, error) {
	if !s.Ready() {
		return SendResult{}, ErrNotConnected
	}

	jid, err := s.resolve(ctx, digits)
	if err != nil {
		return SendResult{}, err
	}

	msg := &waE2E.Message{Conversation: proto.String(text)}

	var extra []whatsmeow.SendRequestExtra
	if messageID != "" {
		extra = append(extra, whatsmeow.SendRequestExtra{ID: types.MessageID(messageID)})
	}

	resp, err := s.client.SendMessage(ctx, jid, msg, extra...)
	if err != nil {
		return SendResult{}, fmt.Errorf("failed to send message: %w", err)
	}

	return SendResult{
		ID:        string(resp.ID),
		To:        jid.String(),
		Timestamp: resp.Timestamp.UTC(),
	}, nil
}

// resolve confirms the number is on WhatsApp and returns the canonical JID to
// send to, which may be a LID rather than a phone-number JID.
func (s *Service) resolve(ctx context.Context, digits string) (types.JID, error) {
	// IsOnWhatsApp wants international format including the "+" prefix.
	resp, err := s.client.IsOnWhatsApp(ctx, []string{"+" + digits})
	if err != nil {
		return types.JID{}, fmt.Errorf("failed to check whatsapp registration: %w", err)
	}
	if len(resp) == 0 || !resp[0].IsIn {
		return types.JID{}, ErrNotOnWhatsApp
	}
	return resp[0].JID, nil
}
