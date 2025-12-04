package blockobjects

import (
	"fmt"
	"shared/pkg/graph/models"
)

type BlockBlockParser struct{}

func (b *BlockBlockParser) Type() string {
	return "Block"
}

var BlockBlock = &BlockBlockParser{}

func (b *BlockBlockParser) Parse(input interface{}) (*models.Blocks, error) {
	in, ok := input.(*models.BlockBlockInput)
	if !ok || in == nil {
		return nil, fmt.Errorf("invalid input for Block block")
	}
	markDefs := make([]*models.MarkDefs, 0, len(in.MarkDefs))
	for _, md := range in.MarkDefs {
		if def := parseMarkDef(md); def != nil {
			markDefs = append(markDefs, def)
		}
	}
	children := make([]*models.Span, 0, len(in.Children))
	for _, sp := range in.Children {
		children = append(children, parseSpan(sp))
	}
	return &models.Blocks{
		Block: &models.BlockBlock{
			Type:     models.BlockType(in.Type),
			Key:      in.Key,
			Style:    in.Style,
			Children: children,
			MarkDefs: markDefs,
			ListItem: in.ListItem,
			Level:    in.Level,
		}}, nil
}

// parse SpanInput to Span
func parseSpan(input *models.SpanInput) *models.Span {
	if input == nil {
		return nil
	}
	return &models.Span{
		Type:  input.Type,
		Key:   input.Key,
		Text:  input.Text,
		Marks: input.Marks,
	}
}

// parse MarkDefInput to MarkDefUnion
func parseMarkDef(input *models.MarkDefInput) *models.MarkDefs {
	if input == nil {
		return nil
	}

	if input.Link != nil {
		return &models.MarkDefs{
			Link: &models.LinkMarkDef{
				Type:  models.MarkDefTypeLink,
				Key:   input.Link.Key,
				Href:  input.Link.Href,
				Title: input.Link.Title,
			},
		}
	}

	if input.Comment != nil {
		return &models.MarkDefs{
			Comment: &models.CommentMarkDef{
				Type: models.MarkDefTypeComment,
				Key:  input.Comment.Key,
				Text: input.Comment.Text,
			},
		}
	}

	return nil
}
