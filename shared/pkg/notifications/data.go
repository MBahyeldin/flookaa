package notifications

// Data is the notifications.data column: what the UI needs to render or link
// a notification that isn't recounted. Every field is optional; rows written
// before a field existed don't have it.
//
// Only store facts that can't change for the notification's life: ids (a
// comment's thread never moves to another post) or a news item's fixed title.
// Never names, avatars, counts or editable text; those would go stale, so the
// API looks them up at read time, as it does for actors.
type Data struct {
	// PostID is the post at the top of the thread a content notification
	// is about (the subject itself for post kinds), for linking to it.
	PostID string `json:"post_id,omitempty"`
}
