package logo

import "regexp"

// An s3 file URL as the frontend stores it: VITE_S3_BUCKET_BASE_URL + "/files/<storage key>".
var pattern = regexp.MustCompile(`^(https?://[^/\s?#]+(/[^\s?#]*)?)?/files/[A-Za-z0-9-]+$`)

// Valid is the logo rule shared by channels and communities: empty (initials) or an s3 file.
func Valid(s string) bool {
	return s == "" || pattern.MatchString(s)
}

// ValidPosition is a cover's focal point on one axis, in percent; nil leaves it as it is.
func ValidPosition(p *int) bool {
	return p == nil || (*p >= 0 && *p <= 100)
}
