package nats

import "shared/pkg/db"

// Notification events. The notifier publishes them to USER_EVENTS_STREAM as
// {stream}.PERSONA.{recipient}.notifications.{create|delete}, a subject every
// persona is subscribed to by default. Like the other realtime events they
// carry the id only; the browser refetches the notification over REST.
//
// notifications.create: a notification is new, or came back to the top as
// unread. notifications.delete: it disappeared (unliked, content deleted,
// join request resolved).
const EventNotification db.EventEnum = "notifications"

// NotificationPayload is the payload of notification events.
type NotificationPayload struct {
	NotificationID int64 `json:"notification_id"`
}
