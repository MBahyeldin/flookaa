package directives

import (
	"context"
	"fmt"
	"reflect"

	"github.com/99designs/gqlgen/graphql"
)

func Oneof(ctx context.Context, obj interface{}, next graphql.Resolver) (res interface{}, err error) {
	// Run the resolver (which unmarshals the input)
	val, err := next(ctx)
	if err != nil {
		return nil, err
	}

	// If val is a slice of inputs (like []*MarkDefInput)
	rv := reflect.ValueOf(val)
	if rv.Kind() == reflect.Slice {
		for i := 0; i < rv.Len(); i++ {
			item := rv.Index(i).Interface()
			if item != nil {
				// Count how many fields are non-zero
				count := 0
				rvItem := reflect.ValueOf(item).Elem()
				for j := 0; j < rvItem.NumField(); j++ {
					field := rvItem.Field(j)
					if !field.IsZero() {
						count++
					}
				}
				if count != 1 {
					return nil, fmt.Errorf("@oneof input must have exactly one field set, got %d", count)
				}
			}
		}
	}

	return val, nil
}
