package blockobjects

import (
	"shared/pkg/graph/models"
)

func parseBreak(in *models.BreakBlockInput) (*models.Blocks, error) {
	if err := requireKey("break", in.Key); err != nil {
		return nil, err
	}
	return &models.Blocks{
		Break: &models.BreakBlock{
			Type: in.Type,
			Key:  in.Key,
		}}, nil
}
