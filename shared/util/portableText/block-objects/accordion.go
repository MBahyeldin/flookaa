package blockobjects

import (
	"strings"

	"shared/pkg/graph/models"
)

const maxAccordionItems = 20

func parseAccordion(in *models.AccordionBlockInput) (*models.Blocks, error) {
	if err := requireKey("accordion", in.Key); err != nil {
		return nil, err
	}
	if err := checkTitle("accordion", in.Key, "title", in.Title); err != nil {
		return nil, err
	}
	if len(in.Items) == 0 {
		return nil, invalid("accordion", in.Key, "at least one section is required")
	}
	if len(in.Items) > maxAccordionItems {
		return nil, invalid("accordion", in.Key, "at most %d sections are allowed", maxAccordionItems)
	}
	seen := make(map[string]bool, len(in.Items))
	items := make([]*models.AccordionItem, 0, len(in.Items))
	for i, item := range in.Items {
		if err := checkItem("accordion", in.Key, "section", i, item.Key, item.Title, seen); err != nil {
			return nil, err
		}
		if strings.TrimSpace(item.Text) == "" {
			return nil, invalid("accordion", in.Key, "section %d content is required", i+1)
		}
		items = append(items, &models.AccordionItem{Key: item.Key, Title: item.Title, Text: item.Text})
	}
	return &models.Blocks{
		Accordion: &models.AccordionBlock{
			Type:             in.Type,
			Key:              in.Key,
			Title:            in.Title,
			Items:            items,
			AllowMultiple:    in.AllowMultiple,
			DefaultFirstOpen: in.DefaultFirstOpen,
		}}, nil
}
