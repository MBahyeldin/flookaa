package blockobjects

import (
	"shared/pkg/graph/models"
)

const maxListLevel = 6

// Matches the decorators in the editor schema (front-end portable-text/schema.ts).
var decorators = map[string]bool{
	"strong":         true,
	"em":             true,
	"code":           true,
	"underline":      true,
	"strike-through": true,
	"subscript":      true,
	"superscript":    true,
}

func parseBlock(in *models.BlockBlockInput) (*models.Blocks, error) {
	if err := requireKey("text", in.Key); err != nil {
		return nil, err
	}
	if in.Level != nil && (*in.Level < 1 || *in.Level > maxListLevel) {
		return nil, invalid("text", in.Key, "list level must be 1-%d", maxListLevel)
	}

	markKeys := make(map[string]bool, len(in.MarkDefs))
	markDefs := make([]*models.MarkDefs, 0, len(in.MarkDefs))
	for _, md := range in.MarkDefs {
		if md == nil || md.Link == nil {
			return nil, invalid("text", in.Key, "unknown mark definition")
		}
		link := md.Link
		if link.Key == "" || markKeys[link.Key] {
			return nil, invalid("text", in.Key, "mark definitions need unique keys")
		}
		if !safeURL(link.Href, "http", "https", "mailto") {
			return nil, invalid("text", in.Key, "link must be http(s), mailto or a same-site path")
		}
		markKeys[link.Key] = true
		markDefs = append(markDefs, &models.MarkDefs{
			Link: &models.LinkMarkDef{
				Type:  models.MarkDefTypeLink,
				Key:   link.Key,
				Href:  link.Href,
				Title: link.Title,
			},
		})
	}

	children := make([]*models.Span, 0, len(in.Children))
	for _, sp := range in.Children {
		if sp == nil {
			return nil, invalid("text", in.Key, "empty span")
		}
		for _, m := range sp.Marks {
			if !decorators[m] && !markKeys[m] {
				return nil, invalid("text", in.Key, "unknown mark %q", m)
			}
		}
		children = append(children, &models.Span{
			Type:  sp.Type,
			Key:   sp.Key,
			Text:  sp.Text,
			Marks: sp.Marks,
		})
	}

	return &models.Blocks{
		Block: &models.BlockBlock{
			Type:     in.Type,
			Key:      in.Key,
			Style:    in.Style,
			Children: children,
			MarkDefs: markDefs,
			ListItem: in.ListItem,
			Level:    in.Level,
		}}, nil
}
