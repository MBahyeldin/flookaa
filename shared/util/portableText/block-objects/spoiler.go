package blockobjects

import (
	"strings"

	"shared/pkg/graph/models"
)

const maxSpoilerBlocks = 20

func parseSpoiler(in *models.SpoilerBlockInput) (*models.Blocks, error) {
	if err := requireKey("spoiler", in.Key); err != nil {
		return nil, err
	}
	if err := checkTitle("spoiler", in.Key, "label", in.Label); err != nil {
		return nil, err
	}
	if len(in.Content) == 0 {
		return nil, invalid("spoiler", in.Key, "content is required")
	}
	if len(in.Content) > maxSpoilerBlocks {
		return nil, invalid("spoiler", in.Key, "at most %d content blocks are allowed", maxSpoilerBlocks)
	}
	seen := make(map[string]bool, len(in.Content))
	content := make([]*models.Blocks, 0, len(in.Content))
	blank := true
	for i, child := range in.Content {
		if child == nil || child.Block == nil || !plainParagraph(child.Block) {
			return nil, invalid("spoiler", in.Key, "content block %d must be plain text", i+1)
		}
		if seen[child.Block.Key] {
			return nil, invalid("spoiler", in.Key, "content block %d has a duplicate _key", i+1)
		}
		parsed, err := parseBlock(child.Block)
		if err != nil {
			return nil, err
		}
		seen[child.Block.Key] = true
		for _, sp := range child.Block.Children {
			if strings.TrimSpace(sp.Text) != "" {
				blank = false
			}
		}
		content = append(content, parsed)
	}
	if blank {
		return nil, invalid("spoiler", in.Key, "content is required")
	}
	return &models.Blocks{
		Spoiler: &models.SpoilerBlock{
			Type:    in.Type,
			Key:     in.Key,
			Label:   in.Label,
			Content: content,
		}}, nil
}

// Only what the v1 form writes, so Edit can read it back without loss.
func plainParagraph(b *models.BlockBlockInput) bool {
	if b.Style != models.StyleTypeNormal || b.ListItem != nil || b.Level != nil || len(b.MarkDefs) > 0 {
		return false
	}
	for _, sp := range b.Children {
		if sp == nil || len(sp.Marks) > 0 {
			return false
		}
	}
	return true
}
