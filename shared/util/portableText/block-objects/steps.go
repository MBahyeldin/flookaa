package blockobjects

import "shared/pkg/graph/models"

const maxSteps = 20

func parseSteps(in *models.StepsBlockInput) (*models.Blocks, error) {
	if err := requireKey("steps", in.Key); err != nil {
		return nil, err
	}
	if len(in.Items) == 0 {
		return nil, invalid("steps", in.Key, "at least one step is required")
	}
	if len(in.Items) > maxSteps {
		return nil, invalid("steps", in.Key, "at most %d steps are allowed", maxSteps)
	}
	seen := make(map[string]bool, len(in.Items))
	items := make([]*models.StepItem, 0, len(in.Items))
	for i, item := range in.Items {
		if err := checkItem("steps", in.Key, "step", i, item.Key, item.Title, seen); err != nil {
			return nil, err
		}
		items = append(items, &models.StepItem{Key: item.Key, Title: item.Title, Text: item.Text})
	}
	return &models.Blocks{
		Steps: &models.StepsBlock{
			Type:  in.Type,
			Key:   in.Key,
			Items: items,
		}}, nil
}
