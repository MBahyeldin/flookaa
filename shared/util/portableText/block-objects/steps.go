package blockobjects

import (
	"strings"

	"shared/pkg/graph/models"
)

const (
	maxSteps     = 20
	maxStepTitle = 120
)

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
		if item.Key == "" {
			return nil, invalid("steps", in.Key, "step %d is missing _key", i+1)
		}
		if seen[item.Key] {
			return nil, invalid("steps", in.Key, "step %d has a duplicate _key", i+1)
		}
		seen[item.Key] = true
		if strings.TrimSpace(item.Title) == "" {
			return nil, invalid("steps", in.Key, "step %d title is required", i+1)
		}
		if utf16Len(item.Title) > maxStepTitle {
			return nil, invalid("steps", in.Key, "step %d title must be at most %d characters", i+1, maxStepTitle)
		}
		if strings.ContainsAny(item.Title, "\r\n") {
			return nil, invalid("steps", in.Key, "step %d title must be one line", i+1)
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
