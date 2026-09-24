package phone

import (
	"errors"
	"regexp"
	"strings"
)

var (
	ErrEmpty       = errors.New("phone number is empty")
	ErrNoDigits    = errors.New("phone number contains no digits")
	ErrNationalFmt = errors.New("phone number must be in international format, not national (leading 0)")
	ErrLength      = errors.New("phone number must be 7 to 15 digits in international format")
)

var nonDigits = regexp.MustCompile(`\D`)

// Normalize turns a user-supplied phone number into bare E.164 digits, with no
// "+" and no separators: "+20 123 456-7890" becomes "201234567890".
//
// It deliberately refuses national-format numbers (a leading 0 after the "00"
// international prefix is stripped) rather than guessing a country code —
// guessing wrong means the message silently goes to a stranger.
func Normalize(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", ErrEmpty
	}

	digits := nonDigits.ReplaceAllString(trimmed, "")

	// "0020..." is the international dialling prefix; drop it.
	digits = strings.TrimPrefix(digits, "00")

	if digits == "" {
		return "", ErrNoDigits
	}
	if strings.HasPrefix(digits, "0") {
		return "", ErrNationalFmt
	}
	// E.164 allows at most 15 digits; 7 is a reasonable floor for a country
	// code plus subscriber number.
	if len(digits) < 7 || len(digits) > 15 {
		return "", ErrLength
	}

	return digits, nil
}

// Mask partially redacts a normalized number for log output.
func Mask(digits string) string {
	if len(digits) <= 7 {
		return digits
	}
	return digits[:4] + strings.Repeat("*", len(digits)-7) + digits[len(digits)-3:]
}
