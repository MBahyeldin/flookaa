package portabletext

import (
	"log"
	"shared/pkg/graph/models"
	blockobjects "shared/util/portableText/block-objects"
)

func ParseContent(input models.PortableTextInput) *models.PortableText {
	if input.Blocks == nil {
		return nil
	}
	log.Printf("Parsing %d blocks", len(input.Blocks))
	blocks := make([]*models.Blocks, 0, len(input.Blocks))
	for _, b := range input.Blocks {
		if blk, err := blockobjects.ParseBlock(b); err == nil {
			blocks = append(blocks, blk)
		} else {
			log.Printf("Error parsing block: %v", err)
		}
	}
	log.Printf("Parsed %d blocks", len(blocks))
	return &models.PortableText{
		Blocks: blocks,
	}
}
