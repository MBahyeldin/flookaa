package blockobjects

import (
	"net/url"
	"strings"
	"unicode/utf16"
)

// safeURL accepts a same-site path or an absolute URL with one of the given schemes.
func safeURL(raw string, schemes ...string) bool {
	if raw == "" || raw != strings.TrimSpace(raw) {
		return false
	}
	if strings.HasPrefix(raw, "/") {
		// "//host" and "/\host" are protocol-relative in browsers, not same-site.
		return !strings.HasPrefix(raw, "//") && !strings.HasPrefix(raw, "/\\")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	scheme := strings.ToLower(u.Scheme)
	for _, s := range schemes {
		if scheme == s {
			return scheme == "mailto" || u.Host != ""
		}
	}
	return false
}

func utf16Len(s string) int {
	return len(utf16.Encode([]rune(s)))
}
