package blockobjects

import (
	"fmt"
	"shared/pkg/graph/models"
)

type BreakerBlockParser struct{}

func (b *BreakerBlockParser) Type() string {
	return "Break"
}

func (b *BreakerBlockParser) Parse(input interface{}) (*models.Blocks, error) {
	in, ok := input.(*models.BreakBlockInput)
	if !ok || in == nil {
		return nil, fmt.Errorf("invalid input for Break block")
	}
	return &models.Blocks{
		Break: &models.BreakBlock{
			Type: in.Type,
			Key:  in.Key,
		}}, nil
}

var BreakerBlock = &BreakerBlockParser{}
