package models

import (
	"log"
	"shared/external/db/nats"
	"shared/pkg/db"
	"time"
)

func PostMapper(genericObject *PostGenericDocument) *Post {
	if genericObject == nil {
		return nil
	}
	return &Post{
		ID:                genericObject.ID,
		Type:              genericObject.Type,
		AuthorID:          genericObject.AuthorID,
		Owner:             genericObject.Owner,
		Content:           genericObject.Content,
		RawContent:        genericObject.RawContent,
		Tags:              genericObject.Tags,
		CreatedAt:         genericObject.CreatedAt,
		UpdatedAt:         genericObject.UpdatedAt,
		DeletedAt:         genericObject.DeletedAt,
		Edited:            genericObject.Edited,
		Privacy:           genericObject.Privacy,
		AllowedPersonaIds: genericObject.AllowedPersonaIds,
		DeniedPersonaIds:  genericObject.DeniedPersonaIds,
		Author:            &Persona{},
		Meta:              &Meta{},
		PersonalizedMeta:  &PersonalizedMeta{ACL: &ACL{}},
	}
}

func CommentMapper(genericObject *PostGenericDocument) *Comment {
	if genericObject == nil {
		return nil
	}
	if genericObject.ParentID == nil {
		log.Println("Warning: CommentMapper called with genericObject having nil ParentID" + genericObject.ID)
		return nil
	}
	return &Comment{
		ID:                genericObject.ID,
		Type:              genericObject.Type,
		ParentID:          *genericObject.ParentID,
		AuthorID:          genericObject.AuthorID,
		Content:           genericObject.Content,
		RawContent:        genericObject.RawContent,
		Tags:              genericObject.Tags,
		CreatedAt:         genericObject.CreatedAt,
		UpdatedAt:         genericObject.UpdatedAt,
		DeletedAt:         genericObject.DeletedAt,
		Edited:            genericObject.Edited,
		Privacy:           genericObject.Privacy,
		AllowedPersonaIds: genericObject.AllowedPersonaIds,
		DeniedPersonaIds:  genericObject.DeniedPersonaIds,
		Author:            &Persona{},
		Meta:              &Meta{},
		PersonalizedMeta:  &PersonalizedMeta{ACL: &ACL{}},
	}
}

func EventMapper(eventParam db.CreateEventParams) *nats.Event {
	return &nats.Event{
		Name:       eventParam.Name,
		Action:     eventParam.Action,
		TargetId:   eventParam.TargetID,
		TargetType: eventParam.TargetType,
		Owner:      eventParam.Owner,
		OwnerID:    eventParam.OwnerID,
		ActorID:    eventParam.ActorID,
		Timestamp:  time.Now().UnixMilli(),
	}
}
