package blockobjects

import (
	"strings"

	"shared/pkg/graph/models"
)

const maxCalloutTag = 24

func parseCallout(in *models.CalloutBlockInput) (*models.Blocks, error) {
	if err := requireKey("callout", in.Key); err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.Description) == "" {
		return nil, invalid("callout", in.Key, "description is required")
	}
	if err := checkTitle("callout", in.Key, "title", in.Title); err != nil {
		return nil, err
	}
	if in.Tag != nil {
		if utf16Len(*in.Tag) > maxCalloutTag {
			return nil, invalid("callout", in.Key, "tag must be at most %d characters", maxCalloutTag)
		}
		if strings.ContainsAny(*in.Tag, "\r\n") {
			return nil, invalid("callout", in.Key, "tag must be one line")
		}
	}
	return &models.Blocks{
		Callout: &models.CalloutBlock{
			Type:        in.Type,
			Key:         in.Key,
			Tone:        in.Tone,
			Icon:        in.Icon,
			Tag:         in.Tag,
			Title:       in.Title,
			Description: in.Description,
		}}, nil
}
