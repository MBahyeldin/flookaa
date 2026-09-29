package v1

import (
	"app/internal/auth"
	"app/internal/db/postgres/handlers/notifications"

	"github.com/gin-gonic/gin"
)

func AddNotificationsRoutes(r *gin.RouterGroup, notifications *notifications.Handler) {
	notificationsGroup := r.Group("/notifications", auth.RequirePersona())
	{
		notificationsGroup.GET("", notifications.ListNotifications)
		notificationsGroup.GET("/unread-count", notifications.UnreadCount)
		notificationsGroup.POST("/read", notifications.MarkRead)
		notificationsGroup.POST("/read-all", notifications.MarkAllRead)
	}
}
