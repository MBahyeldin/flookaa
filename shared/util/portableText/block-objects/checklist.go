package blockobjects

import "shared/pkg/graph/models"

const maxChecklistItems = 50

func parseChecklist(in *models.ChecklistBlockInput) (*models.Blocks, error) {
	if err := requireKey("checklist", in.Key); err != nil {
		return nil, err
	}
	if err := checkTitle("checklist", in.Key, "title", in.Title); err != nil {
		return nil, err
	}
	if len(in.Items) == 0 {
		return nil, invalid("checklist", in.Key, "at least one item is required")
	}
	if len(in.Items) > maxChecklistItems {
		return nil, invalid("checklist", in.Key, "at most %d items are allowed", maxChecklistItems)
	}
	seen := make(map[string]bool, len(in.Items))
	items := make([]*models.ChecklistItem, 0, len(in.Items))
	for i, item := range in.Items {
		if err := checkItem("checklist", in.Key, "item", i, item.Key, item.Text, seen); err != nil {
			return nil, err
		}
		items = append(items, &models.ChecklistItem{
			Key:     item.Key,
			Text:    item.Text,
			Checked: item.Checked != nil && *item.Checked,
		})
	}
	return &models.Blocks{
		Checklist: &models.ChecklistBlock{
			Type:  in.Type,
			Key:   in.Key,
			Title: in.Title,
			Items: items,
		}}, nil
}
