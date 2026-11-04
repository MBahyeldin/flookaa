package models

import (
	"errors"
	"shared/pkg/graph/models"
	"shared/util/s3url"
	"strings"
	"unicode/utf8"
)

const maxCommentRunes = 2000

var (
	errInvalidComment           = errors.New("invalid_comment")
	errInvalidCommentAttachment = errors.New("invalid_comment_attachment")
)

func (r *Resolver) parseSimpleInput(in models.SimpleInput) (models.SimpleInput, error) {
	switch in.Type {
	case models.SimpleInputTypeText:
		in.Content = strings.TrimSpace(in.Content)
		if in.Content == "" || utf8.RuneCountInString(in.Content) > maxCommentRunes {
			return in, errInvalidComment
		}
	case models.SimpleInputTypeMedia:
		if !s3url.File(r.S3BaseURL, in.Content) {
			return in, errInvalidCommentAttachment
		}
	case models.SimpleInputTypeVoice:
		if !s3url.Audio(r.S3BaseURL, in.Content) {
			return in, errInvalidCommentAttachment
		}
	default:
		return in, errInvalidComment
	}
	return in, nil
}
