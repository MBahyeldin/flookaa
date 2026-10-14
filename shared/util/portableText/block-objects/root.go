package blockobjects

import (
	"errors"
	"fmt"
	"shared/pkg/graph/models"
)

// ParseBlock validates one block and converts it to its stored form.
func ParseBlock(in *models.BlockInput) (*models.Blocks, error) {
	switch {
	case in == nil:
		return nil, errors.New("invalid block: empty")
	case in.Block != nil:
		return parseBlock(in.Block)
	case in.Image != nil:
		return parseImage(in.Image)
	case in.Break != nil:
		return parseBreak(in.Break)
	case in.Callout != nil:
		return parseCallout(in.Callout)
	case in.Quote != nil:
		return parseQuote(in.Quote)
	case in.Steps != nil:
		return parseSteps(in.Steps)
	case in.Accordion != nil:
		return parseAccordion(in.Accordion)
	}
	return nil, errors.New("invalid block: unknown type")
}

// Key returns the block's _key.
func Key(b *models.Blocks) string {
	switch {
	case b.Block != nil:
		return b.Block.Key
	case b.Image != nil:
		return b.Image.Key
	case b.Break != nil:
		return b.Break.Key
	case b.Callout != nil:
		return b.Callout.Key
	case b.Quote != nil:
		return b.Quote.Key
	case b.Steps != nil:
		return b.Steps.Key
	case b.Accordion != nil:
		return b.Accordion.Key
	}
	return ""
}

// TextLength counts the block's text in UTF-16 units, like JavaScript's .length.
func TextLength(b *models.Blocks) int {
	if b.Callout != nil {
		n := utf16Len(b.Callout.Description)
		if b.Callout.Title != nil {
			n += utf16Len(*b.Callout.Title)
		}
		return n
	}
	if b.Quote != nil {
		n := utf16Len(b.Quote.Text)
		for _, s := range []*string{b.Quote.Name, b.Quote.Role} {
			if s != nil {
				n += utf16Len(*s)
			}
		}
		return n
	}
	if b.Steps != nil {
		n := 0
		for _, item := range b.Steps.Items {
			n += utf16Len(item.Title)
			if item.Text != nil {
				n += utf16Len(*item.Text)
			}
		}
		return n
	}
	if b.Accordion != nil {
		n := 0
		for _, item := range b.Accordion.Items {
			n += utf16Len(item.Title) + utf16Len(item.Text)
		}
		return n
	}
	if b.Block == nil {
		return 0
	}
	n := 0
	for _, sp := range b.Block.Children {
		n += utf16Len(sp.Text)
	}
	return n
}

func invalid(blockType, key, format string, args ...any) error {
	return fmt.Errorf("invalid %s block %s: %s", blockType, key, fmt.Sprintf(format, args...))
}

func requireKey(blockType, key string) error {
	if key == "" {
		return fmt.Errorf("invalid %s block: missing _key", blockType)
	}
	return nil
}
