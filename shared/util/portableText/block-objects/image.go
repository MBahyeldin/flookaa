package blockobjects

import (
	"fmt"
	"shared/pkg/graph/models"
)

type ImageBlockParser struct{}

func (b *ImageBlockParser) Type() string {
	return "Image"
}

func (b *ImageBlockParser) Parse(input interface{}) (*models.Blocks, error) {
	in, ok := input.(*models.ImageBlockInput)
	if !ok || in == nil {
		return nil, fmt.Errorf("invalid input type")
	}
	return &models.Blocks{
		Image: &models.ImageBlock{
			Type:    in.Type,
			Key:     in.Key,
			Src:     in.Src,
			Alt:     in.Alt,
			Caption: in.Caption,
			Width:   in.Width,
			Height:  in.Height,
		}}, nil
}

var ImageBlock = &ImageBlockParser{}
