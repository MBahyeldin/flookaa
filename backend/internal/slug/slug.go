package slug

import "regexp"

var pattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

// Valid is the slug rule shared by personas and interests: 3–50 lowercase
// letters and digits, joined by single hyphens.
func Valid(s string) bool {
	return len(s) >= 3 && len(s) <= 50 && pattern.MatchString(s)
}
