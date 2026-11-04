package s3url

import (
	"regexp"
	"strings"
)

var (
	file  = regexp.MustCompile(`^/files/[A-Za-z0-9-]+$`)
	audio = regexp.MustCompile(`^/audio/[A-Za-z0-9-]+\.mp3$`)
)

// File reports whether raw is an uploaded image on the s3 service at base.
func File(base, raw string) bool {
	return on(base, raw, file)
}

// Audio reports whether raw is a processed voice note on the s3 service at base.
func Audio(base, raw string) bool {
	return on(base, raw, audio)
}

func on(base, raw string, path *regexp.Regexp) bool {
	base = strings.TrimRight(base, "/")
	rest, ok := strings.CutPrefix(raw, base)
	return ok && base != "" && path.MatchString(rest)
}
