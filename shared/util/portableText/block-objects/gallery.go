package blockobjects

import (
	"fmt"

	"shared/pkg/graph/models"
)

const (
	minGalleryItems = 2
	maxGalleryItems = 20
	maxAlt          = 300
)

func parseGallery(in *models.GalleryBlockInput) (*models.Blocks, error) {
	if err := requireKey("gallery", in.Key); err != nil {
		return nil, err
	}
	if len(in.Items) < minGalleryItems {
		return nil, invalid("gallery", in.Key, "at least %d images are required", minGalleryItems)
	}
	if len(in.Items) > maxGalleryItems {
		return nil, invalid("gallery", in.Key, "at most %d images are allowed", maxGalleryItems)
	}
	seen := make(map[string]bool, len(in.Items))
	items := make([]*models.GalleryItem, 0, len(in.Items))
	for i, item := range in.Items {
		if err := checkItemKey("gallery", in.Key, "image", i, item.Key, seen); err != nil {
			return nil, err
		}
		if !safeURL(item.Src, "http", "https") {
			return nil, invalid("gallery", in.Key, "image %d src must be http(s) or a same-site path", i+1)
		}
		for _, side := range []*int32{item.Width, item.Height} {
			if side != nil && (*side < 1 || *side > maxImageSide) {
				return nil, invalid("gallery", in.Key, "image %d width and height must be 1-%d", i+1, maxImageSide)
			}
		}
		if item.Alt != nil && utf16Len(*item.Alt) > maxAlt {
			return nil, invalid("gallery", in.Key, "image %d alt must be at most %d characters", i+1, maxAlt)
		}
		if err := checkTitle("gallery", in.Key, fmt.Sprintf("image %d caption", i+1), item.Caption); err != nil {
			return nil, err
		}
		items = append(items, &models.GalleryItem{
			Key:     item.Key,
			Src:     item.Src,
			Alt:     item.Alt,
			Caption: item.Caption,
			Width:   item.Width,
			Height:  item.Height,
		})
	}
	return &models.Blocks{
		Gallery: &models.GalleryBlock{
			Type:   in.Type,
			Key:    in.Key,
			Layout: in.Layout,
			Items:  items,
		}}, nil
}
