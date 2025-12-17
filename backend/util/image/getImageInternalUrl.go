package image

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"shared/util/token"
)

type GetImageFromUrlRequest struct {
	Token string `json:"token" binding:"required"`
}

var S3_BASE_URL = os.Getenv("S3_BASE_URL")

func GetImageInternalUrl(imageUrl string) (string, error) {
	signedToken, err := token.Generate(
		map[string]interface{}{
			"Url":    imageUrl,
			"Client": "internal",
		},
	)
	if err != nil {
		return "", err
	}
	body := GetImageFromUrlRequest{
		Token: signedToken,
	}

	requestBody, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	imagePath, err := http.Post(
		fmt.Sprintf("%s/api/v1/get-image-from-url", S3_BASE_URL),
		"application/json",
		bytes.NewReader(requestBody),
	)

	if err != nil {
		return "", err
	}
	defer imagePath.Body.Close()

	var response struct {
		Url string `json:"url"`
	}
	if err := json.NewDecoder(imagePath.Body).Decode(&response); err != nil {
		return "", err
	}

	finalUrl := fmt.Sprintf("%s%s", S3_BASE_URL, response.Url)

	return finalUrl, nil
}
