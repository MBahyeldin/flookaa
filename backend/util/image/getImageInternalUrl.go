package image

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"shared/util/token"
)

type GetImageFromUrlRequest struct {
	Token string `json:"token" binding:"required"`
}

// Client asks the s3 service to copy a remote image into its own storage.
type Client struct {
	baseURL string
	signer  *token.Signer
}

func NewClient(baseURL string, signer *token.Signer) *Client {
	return &Client{baseURL: baseURL, signer: signer}
}

func (c *Client) GetImageInternalUrl(imageUrl string) (string, error) {
	signedToken, err := c.signer.Generate(
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
		fmt.Sprintf("%s/api/v1/get-image-from-url", c.baseURL),
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

	finalUrl := fmt.Sprintf("%s%s", c.baseURL, response.Url)

	return finalUrl, nil
}
