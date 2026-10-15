package blockobjects

import "shared/pkg/graph/models"

const maxVoiceNoteSeconds = 600

func parseVoiceNote(in *models.VoiceNoteBlockInput) (*models.Blocks, error) {
	if err := requireKey("voiceNote", in.Key); err != nil {
		return nil, err
	}
	if !safeURL(in.Src, "http", "https") {
		return nil, invalid("voiceNote", in.Key, "src must be http(s) or a same-site path")
	}
	if err := checkTitle("voiceNote", in.Key, "title", in.Title); err != nil {
		return nil, err
	}
	if in.Duration != nil && (*in.Duration < 1 || *in.Duration > maxVoiceNoteSeconds) {
		return nil, invalid("voiceNote", in.Key, "duration must be 1-%d seconds", maxVoiceNoteSeconds)
	}
	return &models.Blocks{
		VoiceNote: &models.VoiceNoteBlock{
			Type:     in.Type,
			Key:      in.Key,
			Src:      in.Src,
			Title:    in.Title,
			Duration: in.Duration,
		}}, nil
}
