package blockobjects

import (
	"shared/pkg/graph/models"
)

const maxImageSide = 4096

func parseImage(in *models.ImageBlockInput) (*models.Blocks, error) {
	if err := requireKey("image", in.Key); err != nil {
		return nil, err
	}
	if !safeURL(in.Src, "http", "https") {
		return nil, invalid("image", in.Key, "src must be http(s) or a same-site path")
	}
	for _, side := range []*int32{in.Width, in.Height} {
		if side != nil && (*side < 1 || *side > maxImageSide) {
			return nil, invalid("image", in.Key, "width and height must be 1-%d", maxImageSide)
		}
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
			Size:    in.Size,
			Align:   in.Align,
		}}, nil
}
