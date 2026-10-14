package blockobjects

import (
	"strings"

	"shared/pkg/graph/models"
)

func parseCallout(in *models.CalloutBlockInput) (*models.Blocks, error) {
	if err := requireKey("callout", in.Key); err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.Description) == "" {
		return nil, invalid("callout", in.Key, "description is required")
	}
	if err := checkTitle("callout", in.Key, in.Title); err != nil {
		return nil, err
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
