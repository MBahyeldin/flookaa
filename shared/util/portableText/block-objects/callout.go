package blockobjects

import (
	"strings"

	"shared/pkg/graph/models"
)

const maxCalloutTitle = 120

func parseCallout(in *models.CalloutBlockInput) (*models.Blocks, error) {
	if err := requireKey("callout", in.Key); err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.Description) == "" {
		return nil, invalid("callout", in.Key, "description is required")
	}
	if in.Title != nil {
		if utf16Len(*in.Title) > maxCalloutTitle {
			return nil, invalid("callout", in.Key, "title must be at most %d characters", maxCalloutTitle)
		}
		if strings.ContainsAny(*in.Title, "\r\n") {
			return nil, invalid("callout", in.Key, "title must be one line")
		}
	}
	return &models.Blocks{
		Callout: &models.CalloutBlock{
			Type:        in.Type,
			Key:         in.Key,
			Tone:        in.Tone,
			Icon:        in.Icon,
			Title:       in.Title,
			Description: in.Description,
		}}, nil
}
