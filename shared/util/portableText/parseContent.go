package portabletext

import (
	"encoding/json"
	"fmt"
	"shared/pkg/graph/models"
	blockobjects "shared/util/portableText/block-objects"
)

const (
	maxTextLength = 4096 // matches MAX_POST_LENGTH in front-end post-creator
	maxBlocks     = 200
)

// ParseContent validates a post and returns its stored content and rawContent.
// rawContent is marshalled from the parsed content so the two can't drift.
func ParseContent(input models.PortableTextInput) (*models.PortableText, string, error) {
	if len(input.Blocks) > maxBlocks {
		return nil, "", fmt.Errorf("a post holds at most %d blocks", maxBlocks)
	}

	blocks := make([]*models.Blocks, 0, len(input.Blocks))
	keys := make(map[string]bool, len(input.Blocks))
	textLength := 0
	for _, b := range input.Blocks {
		blk, err := blockobjects.ParseBlock(b)
		if err != nil {
			return nil, "", err
		}
		key := blockobjects.Key(blk)
		if keys[key] {
			return nil, "", fmt.Errorf("duplicate block key %s", key)
		}
		keys[key] = true
		textLength += blockobjects.TextLength(blk)
		blocks = append(blocks, blk)
	}
	if textLength > maxTextLength {
		return nil, "", fmt.Errorf("a post holds at most %d characters", maxTextLength)
	}

	content := &models.PortableText{Blocks: blocks}
	raw, err := json.Marshal(content)
	if err != nil {
		return nil, "", fmt.Errorf("failed to marshal content: %w", err)
	}
	return content, string(raw), nil
}
