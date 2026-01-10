package verification

import "crypto/rand"

func generateRandomCode() string {
	// return a randomly generated verification code 6 digits long
	randBytes := make([]byte, 3)
	_, err := rand.Read(randBytes)
	if err != nil {
		return ""
	}

	verificationCode := ""
	for _, b := range randBytes {
		verificationCode += string((b % 10) + '0')
	}

	return verificationCode
}
