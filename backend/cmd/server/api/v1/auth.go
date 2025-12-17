package v1

import (
	"app/internal/db/postgres/handlers/users"
	oauthproviders "app/internal/oauthproviders"
	"net/http"

	"github.com/gin-gonic/gin"
)

func AddAuthRoutes(r *gin.RouterGroup) {
	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", users.Create)
		authGroup.POST("/verify", users.Verify)
		authGroup.POST("/login", users.Login)
		authGroup.POST("/logout", handleLogOut)
		authGroup.GET("/info", users.Info)
		authGroup.GET("/google", oauthproviders.HandleGoogleOAuth)
	}

	oAuthGroup := authGroup.Group("/oauth2callback")
	{
		oAuthGroup.GET("/google", oauthproviders.HandleGoogleOAuthCallback)
	}
}

func handleLogOut(c *gin.Context) {
	// Invalidate the user's session or token here if applicable
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "jwt",
		Value:    "-1",
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   true,
		Domain:   "flookaa.com",
		SameSite: http.SameSiteNoneMode,
	})
	c.JSON(200, gin.H{"message": "Logged out successfully"})
}
