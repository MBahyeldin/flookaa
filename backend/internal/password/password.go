package password

import "unicode"

// Rule ids, in the order the sign-up checklist shows them.
const (
	RuleLength  = "length"
	RuleMax     = "max"
	RuleUpper   = "upper"
	RuleLower   = "lower"
	RuleDigit   = "digit"
	RuleSpecial = "special"
)

const (
	MinChars = 8
	// bcrypt ignores everything past 72 bytes.
	MaxBytes = 72
)

// Check returns the ids of the rules pw breaks; empty means strong enough.
func Check(pw string) []string {
	var upper, lower, digit, special bool
	chars := 0
	for _, r := range pw {
		chars++
		switch {
		case unicode.IsUpper(r):
			upper = true
		case unicode.IsLower(r):
			lower = true
		case unicode.IsDigit(r):
			digit = true
		case unicode.IsLetter(r), unicode.IsSpace(r):
		default:
			special = true
		}
	}
	failed := []string{}
	if chars < MinChars {
		failed = append(failed, RuleLength)
	}
	if len(pw) > MaxBytes {
		failed = append(failed, RuleMax)
	}
	if !upper {
		failed = append(failed, RuleUpper)
	}
	if !lower {
		failed = append(failed, RuleLower)
	}
	if !digit {
		failed = append(failed, RuleDigit)
	}
	if !special {
		failed = append(failed, RuleSpecial)
	}
	return failed
}
