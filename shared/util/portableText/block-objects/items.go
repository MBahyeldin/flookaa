package blockobjects

import "strings"

const maxItemTitle = 120

func checkItem(blockType, blockKey, label string, i int, key, title string, seen map[string]bool) error {
	if key == "" {
		return invalid(blockType, blockKey, "%s %d is missing _key", label, i+1)
	}
	if seen[key] {
		return invalid(blockType, blockKey, "%s %d has a duplicate _key", label, i+1)
	}
	seen[key] = true
	if strings.TrimSpace(title) == "" {
		return invalid(blockType, blockKey, "%s %d title is required", label, i+1)
	}
	if utf16Len(title) > maxItemTitle {
		return invalid(blockType, blockKey, "%s %d title must be at most %d characters", label, i+1, maxItemTitle)
	}
	if strings.ContainsAny(title, "\r\n") {
		return invalid(blockType, blockKey, "%s %d title must be one line", label, i+1)
	}
	return nil
}
