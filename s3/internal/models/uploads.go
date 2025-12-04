package models

import "time"

type UploadRequest struct {
	FileName string `json:"file_name"`
	FileSize int64  `json:"file_size"`
	MimeType string `json:"mime_type"`
}

type Upload struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	TicketID   string    `json:"ticket_id" gorm:"uniqueIndex"`
	ClientIP   string    `json:"client_ip"`
	UserAgent  string    `json:"user_agent"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Filename   string    `json:"filename"`
	Filesize   int64     `json:"filesize"`
	MimeType   string    `json:"mime_type"`
	Checksum   *string   `json:"checksum" gorm:"default:null"`
	StorageKey *string   `json:"storage_key" gorm:"uniqueIndex;default:null"`
	Status     string    `json:"status"`
}
