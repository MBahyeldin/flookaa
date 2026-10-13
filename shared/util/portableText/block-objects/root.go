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
