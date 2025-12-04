package blockobjects

import (
	"fmt"
	"log"
	"reflect"
	"shared/pkg/graph/models"
)

// BlockObject is the common interface for block parsers
type BlockObject interface {
	Type() string
	Parse(input interface{}) (*models.Blocks, error)
}

type BlockObjectsProvider struct {
	BlocksParsers []BlockObject
}

var Provider = &BlockObjectsProvider{
	BlocksParsers: []BlockObject{
		BlockBlock,
		ImageBlock,
		BreakerBlock,
	},
}

func (p *BlockObjectsProvider) GetParserByType(t string) (BlockObject, error) {
	log.Printf("Looking for parser of type: %s", t)
	for _, parser := range p.BlocksParsers {
		if parser.Type() == t {
			return parser, nil
		}
	}
	return nil, fmt.Errorf("unknown block type: %s", t)
}

func ParseBlock(input *models.BlockInput) (*models.Blocks, error) {

	v := reflect.ValueOf(input) // runtime values
	t := reflect.TypeOf(input)  // runtime type info

	if t.Kind() == reflect.Ptr {
		t = t.Elem()
		v = v.Elem()
	}

	// Iterate over struct fields

	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)             // field metadata
		value := v.Field(i).Interface() // actual value
		fmt.Printf("%s = %v (tag: %s)\n",
			field.Name,
			value,
			field.Tag.Get("json"))

		if value != nil {
			parser, err := Provider.GetParserByType(field.Name)
			if err == nil {
				parsedBlock, err := parser.Parse(value)
				if err == nil {
					return parsedBlock, nil
				}
			}
		}
	}
	return nil, fmt.Errorf("unknown block type")
}
