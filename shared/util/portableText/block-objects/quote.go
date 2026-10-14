package blockobjects

import (
	"strings"

	"shared/pkg/graph/models"
)

const maxQuoteAttribution = 120

func parseQuote(in *models.QuoteBlockInput) (*models.Blocks, error) {
	if err := requireKey("quote", in.Key); err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.Text) == "" {
		return nil, invalid("quote", in.Key, "text is required")
	}
	if err := checkAttribution(in.Key, "name", in.Name); err != nil {
		return nil, err
	}
	if err := checkAttribution(in.Key, "role", in.Role); err != nil {
		return nil, err
	}
	return &models.Blocks{
		Quote: &models.QuoteBlock{
			Type: in.Type,
			Key:  in.Key,
			Text: in.Text,
			Name: in.Name,
			Role: in.Role,
		}}, nil
}

func checkAttribution(key, field string, value *string) error {
	if value == nil {
		return nil
	}
	if utf16Len(*value) > maxQuoteAttribution {
		return invalid("quote", key, "%s must be at most %d characters", field, maxQuoteAttribution)
	}
	if strings.ContainsAny(*value, "\r\n") {
		return invalid("quote", key, "%s must be one line", field)
	}
	return nil
}
