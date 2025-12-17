package oauthproviders

import (
	"fmt"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var ClinetId = os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
var ClientSecret = os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")

var config = &oauth2.Config{
	ClientID:     ClinetId,
	ClientSecret: ClientSecret,
	Endpoint:     google.Endpoint,
	// TODO: Change to production URL
	RedirectURL: "http://localhost:5713/oauth2callback/google",
	Scopes: []string{
		"https://www.googleapis.com/auth/userinfo.profile",
		"https://www.googleapis.com/auth/userinfo.email",
	},
}

func GetGoogleOAuthUrl() string {
	url := config.AuthCodeURL("state")
	fmt.Printf("Visit the URL for the auth dialog: %v", url)
	return url
}
