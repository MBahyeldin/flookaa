package oauthproviders

import (
	"app/internal/db/postgres/handlers/users"
	"app/util/image"
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"shared/external/db/postgres"
	"shared/pkg/db"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var ClinetId = os.Getenv("GOOGLE_OAUTH_CLIENT_ID")
var ClientSecret = os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")

var config = &oauth2.Config{
	ClientID:     ClinetId,
	ClientSecret: ClientSecret,
	Endpoint:     google.Endpoint,
	RedirectURL:  "https://api.flookaa.com/api/v1/auth/oauth2callback/google",
	Scopes: []string{
		"https://www.googleapis.com/auth/userinfo.profile",
		"https://www.googleapis.com/auth/userinfo.email",
	},
}

var validStates = map[string]bool{
	"login":  true,
	"signup": true,
}

type GoogleUser struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func HandleGoogleOAuth(c *gin.Context) {
	state := c.Query("state")
	if _, ok := validStates[state]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state parameter"})
		return
	}
	url := config.AuthCodeURL(state)
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func HandleGoogleOAuthCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	if _, ok := validStates[state]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state parameter"})
		return
	}
	token, err := config.Exchange(oauth2.NoContext, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token"})
		return
	}

	client := config.Client(context.Background(), token)

	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		log.Println("Failed to fetch userinfo:", err)
		return
	}
	defer resp.Body.Close()

	var user GoogleUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		log.Println("Decode error:", err)
		return
	}

	ctx := c.Request.Context()
	q := db.New(postgres.DbConn)

	switch state {
	case "login":
		dbUser, err := q.GetUserByEmailAddress(ctx, user.Email)
		if err != nil {
			// welcome new user!, hand it over to signup logic
			handleSignUpRequest(c, user)
			return
		}
		handleLogInRequest(c, users.UserMinimal{ID: dbUser.ID, EmailAddress: dbUser.EmailAddress})
		return
	case "signup":
		// Check if user already exists
		existingUser, err := q.GetUserByEmailAddress(ctx, user.Email)
		if err == nil && existingUser.ID != 0 {
			// I got you bro, you already have an account
			handleLogInRequest(c, users.UserMinimal{ID: existingUser.ID, EmailAddress: existingUser.EmailAddress})
			return
		}
		handleSignUpRequest(c, user)
		return
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state parameter"})
		return
	}
}

func handleLogInRequest(c *gin.Context, user users.UserMinimal) {
	defaultPersona, err := db.New(postgres.DbConn).GetDefaultPersonaByUserId(context.Background(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user persona"})
		return
	}
	user.PersonaId = defaultPersona.ID
	token, err := users.GetLoginToken(users.UserMinimal{ID: user.ID, EmailAddress: user.EmailAddress, PersonaId: user.PersonaId})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token plaese try again"})
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    token,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   true,
		Domain:   "flookaa.com",
		SameSite: http.SameSiteNoneMode,
	})
	c.Redirect(http.StatusFound, "https://flookaa.com")
}

func handleSignUpRequest(c *gin.Context, user GoogleUser) {
	ctx := context.Background()
	q := db.New(postgres.DbConn)

	firstName := ""
	lastName := ""
	thunmbnail, err := image.GetImageInternalUrl(user.Picture)
	if err != nil {
		log.Println("Error getting image from google:", err)
	}
	nameParts := strings.SplitN(user.Name, " ", 2)
	if len(nameParts) > 0 {
		firstName = nameParts[0]
	}
	if len(nameParts) > 1 {
		lastName = nameParts[1]
	}

	newUser, err := q.CreateUser(ctx, db.CreateUserParams{
		EmailAddress:  user.Email,
		FirstName:     firstName,
		LastName:      lastName,
		OauthProvider: db.NullOauthProvider{OauthProvider: db.OauthProviderGoogle, Valid: true},
		Thumbnail:     sql.NullString{String: thunmbnail, Valid: true},
		IsVerified:    sql.NullBool{Bool: true, Valid: true},
	})
	if err != nil {
		log.Println("Error creating user:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	defaultPersona, err := q.GetDefaultPersonaByUserId(ctx, newUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user persona"})
		return
	}

	handleLogInRequest(c, users.UserMinimal{ID: newUser.ID, EmailAddress: newUser.EmailAddress, PersonaId: defaultPersona.ID})
}
