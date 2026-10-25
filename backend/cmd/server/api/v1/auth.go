package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/users"
	oauthproviders "app/internal/oauthproviders"
	"net/http"

	"github.com/gin-gonic/gin"
)

func AddAuthRoutes(r *gin.RouterGroup, users *users.Handler, google *oauthproviders.Google) {
	// Public: these are how a visitor gets a session.
	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", users.Create)
		authGroup.POST("/login", users.Login)
		authGroup.POST("/logout", handleLogOut)
		authGroup.GET("/google", google.HandleGoogleOAuth)
		authGroup.POST("/password/forgot", users.ForgotPassword)
		authGroup.POST("/password/reset/check", users.CheckPasswordReset)
		authGroup.POST("/password/reset", users.ResetPassword)
	}

	oAuthGroup := authGroup.Group("/oauth2callback")
	{
		oAuthGroup.GET("/google", google.HandleGoogleOAuthCallback)
	}

	// Session tier: what an unverified user may still do.
	sessionGroup := authGroup.Group("", auth.RequireSession())
	{
		sessionGroup.POST("/verify", users.Verify)
		sessionGroup.POST("/verify/resend", users.ResendVerification)
		sessionGroup.GET("/info", users.Info)
	}
}

func handleLogOut(c *gin.Context) {
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
