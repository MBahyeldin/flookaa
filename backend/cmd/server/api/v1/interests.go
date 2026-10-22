package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/interests"
	"context"

	"github.com/gin-gonic/gin"
)

func AddInterestsRoutes(r *gin.RouterGroup, h *interests.Handler, isAdmin func(ctx context.Context, userID int64) (bool, error)) {
	r.GET("/interests", h.List)

	admin := r.Group("/admin/interests", auth.RequireAdministrator(isAdmin))
	{
		admin.GET("", h.AdminList)
		admin.POST("", h.Create)
		admin.PATCH("/:id", h.Update)
		admin.POST("/:id/move", h.Move)
		admin.POST("/:id/retire", h.Retire)
		admin.POST("/:id/restore", h.Restore)
	}

	groups := r.Group("/admin/interest-groups", auth.RequireAdministrator(isAdmin))
	{
		groups.POST("", h.CreateGroup)
		groups.PATCH("/:id", h.UpdateGroup)
		groups.POST("/:id/move", h.MoveGroup)
	}
}
