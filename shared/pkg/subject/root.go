package subject

import (
	"fmt"
	"shared/pkg/graph/models"
	"shared/pkg/types"
)

type SubjectHelper struct {
	StreamName  *string
	Owner       models.Owner
	Event       string
	EventAction string
}

type SubjectInterface interface {
	GetSubject() string
}

func New(streamName *string, owner *models.Owner, event string, eventAction string) *SubjectHelper {
	return &SubjectHelper{
		StreamName:  streamName,
		Owner:       *owner,
		Event:       event,
		EventAction: eventAction,
	}
}

func (s *SubjectHelper) GetSubject() string {
	if s.StreamName != nil {
		return fmt.Sprintf("%s.%s.%d.%s.%s", *s.StreamName, s.Owner.Type, s.Owner.ID, s.Event, s.EventAction)
	} else {
		return fmt.Sprintf("%s.%d.%s.%s", s.Owner.Type, s.Owner.ID, s.Event, s.EventAction)
	}
}

func (s *SubjectHelper) GetSubjectWithOffsets(offset int) *types.SubjectOffsets {
	return &types.SubjectOffsets{
		Subject: s.GetSubject(),
		Offset:  offset,
	}
}
