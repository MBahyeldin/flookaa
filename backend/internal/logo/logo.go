package logo

import (
	"database/sql"
	"shared/util/s3url"
)

// Valid is the logo rule shared by channels and communities: empty (initials) or a file on the s3 service at base.
func Valid(base, s string) bool {
	return s == "" || s3url.File(base, s)
}

// ValidPosition is a cover's focal point on one axis, in percent; nil leaves it as it is.
func ValidPosition(p *int) bool {
	return p == nil || (*p >= 0 && *p <= 100)
}

func NullPosition(p *int) sql.NullInt16 {
	if p == nil {
		return sql.NullInt16{}
	}
	return sql.NullInt16{Int16: int16(*p), Valid: true}
}
