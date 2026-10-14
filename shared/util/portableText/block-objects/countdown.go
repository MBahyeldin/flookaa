package blockobjects

import (
	"time"

	"shared/pkg/graph/models"
)

var minCountdown = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)

const maxCountdownYears = 100

func parseCountdown(in *models.CountdownBlockInput) (*models.Blocks, error) {
	if err := requireKey("countdown", in.Key); err != nil {
		return nil, err
	}
	if in.EndsAt.IsZero() {
		return nil, invalid("countdown", in.Key, "endsAt is required")
	}
	// Past dates are allowed so a post can still be saved after its event.
	if in.EndsAt.Before(minCountdown) || in.EndsAt.After(time.Now().AddDate(maxCountdownYears, 0, 0)) {
		return nil, invalid("countdown", in.Key, "endsAt must be between 2000 and %d years from now", maxCountdownYears)
	}
	if err := checkTitle("countdown", in.Key, "label", in.Label); err != nil {
		return nil, err
	}
	if err := checkTitle("countdown", in.Key, "endedText", in.EndedText); err != nil {
		return nil, err
	}
	return &models.Blocks{
		Countdown: &models.CountdownBlock{
			Type:      in.Type,
			Key:       in.Key,
			EndsAt:    in.EndsAt.UTC(),
			Label:     in.Label,
			EndedText: in.EndedText,
		}}, nil
}
