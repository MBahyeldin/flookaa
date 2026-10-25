package models

import (
	"context"
	"errors"
	"fmt"
	"log"
	"shared/external/db/nats"
	"shared/external/db/redis"
	"shared/pkg/access"
	"shared/pkg/counters"
	"shared/pkg/db"
	"shared/pkg/graph"
	"shared/pkg/graph/directives"
	"shared/pkg/graph/models"
	"shared/pkg/subject"
	"shared/util/keys"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func NewExecutableSchema(cfg graph.Config) graphql.ExecutableSchema {
	cfg.Directives.Oneof = directives.Oneof
	return graph.NewExecutableSchema(cfg)
}

type Resolver struct {
	Queries *db.Queries
	Objects *mongo.Collection
	NATS    *nats.NatsHelper
	Content *redis.ContentStore
	Persona *redis.PersonaStore
	// Neo4j is not used in the first version of the app (see shared/external/db/neo).
	// Neo4j neo4j.DriverWithContext
}

var errObjectNotFound = errors.New("not found")

func newObjectID() string {
	return primitive.NewObjectID().Hex()
}

var errNotAllowedToDelete = errors.New("only the author or a channel moderator can delete this")

// loadObject reads a post, comment or reply by id from app.objects. Deleted
// objects are not found, so nobody can comment on or like them either
// ("deletedat": nil matches both null and the field missing on old documents).
func (r *Resolver) loadObject(ctx context.Context, id string) (*models.PostGenericDocument, error) {
	var doc models.PostGenericDocument
	err := r.Objects.FindOne(ctx, bson.M{"id": id, "deletedat": nil}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errObjectNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load object %s: %w", id, err)
	}
	if doc.Owner == nil {
		return nil, errObjectNotFound
	}
	return &doc, nil
}

type ownerAccess int

const (
	accessRead ownerAccess = iota
	// Comments and likes.
	accessReact
	accessPost
)

// authorizeOwner checks whether personaID may use content owned by owner in
// the given way. Callers must pass the owner stored on the object, never the
// client's owner input, when the object already exists. Channels and persona
// walls have rules (shared/pkg/access); other owner types are refused.
func (r *Resolver) authorizeOwner(ctx context.Context, owner *models.Owner, personaID int64, mode ownerAccess) error {
	if owner == nil {
		return errObjectNotFound
	}
	switch owner.Type {
	case models.OwnerTypeChannel:
		channel, err := access.LoadChannel(ctx, r.Queries, owner.ID, personaID)
		if err != nil {
			return err
		}
		if mode == accessRead {
			return channel.Read()
		}
		return channel.Write()
	case models.OwnerTypePersona:
		wall, err := access.LoadWall(ctx, r.Queries, owner.ID, personaID)
		if err != nil {
			return err
		}
		if mode == accessPost {
			return wall.Post()
		}
		return nil
	}
	return errObjectNotFound
}

// canModerate tells whether personaID may delete others' content of owner,
// after checking it may read it.
func (r *Resolver) canModerate(ctx context.Context, owner *models.Owner, personaID int64) (bool, error) {
	switch owner.Type {
	case models.OwnerTypeChannel:
		channel, err := access.LoadChannel(ctx, r.Queries, owner.ID, personaID)
		if err != nil {
			return false, err
		}
		if err := channel.Read(); err != nil {
			return false, err
		}
		return channel.CanModerate, nil
	case models.OwnerTypePersona:
		wall, err := access.LoadWall(ctx, r.Queries, owner.ID, personaID)
		if err != nil {
			return false, err
		}
		return wall.CanModerate(), nil
	}
	return false, errObjectNotFound
}

// deleteObject soft-deletes a post or comment for its author or a moderator
// of its channel. It also soft-deletes the events about the object (its own
// create event and the likes on it), so recounts drop it, and publishes
// <post|comment>.delete: the redis worker recounts the parent and clients
// remove the object.
func (r *Resolver) deleteObject(ctx context.Context, id string, postType models.PostType) error {
	personaID, err := getPersonaIdFromContext(ctx)
	if err != nil {
		return fmt.Errorf("unauthenticated: %w", err)
	}
	obj, err := r.loadObject(ctx, id)
	if err != nil {
		return err
	}
	if obj.Type != postType {
		return errObjectNotFound
	}
	moderator, err := r.canModerate(ctx, obj.Owner, personaID)
	if err != nil {
		return err
	}
	if obj.AuthorID != personaID && !moderator {
		return errNotAllowedToDelete
	}

	// The event of a comment points at its parent; read the parent's type
	// before anything changes (it may itself be deleted already).
	event := db.CreateEventParams{
		Name:       db.EventEnumPost,
		Action:     db.EventActionEnumDelete,
		TargetID:   strconv.FormatInt(obj.Owner.ID, 10),
		TargetType: db.EventTargetTypeEnumCHANNEL,
		Owner:      db.OwnerEnumCHANNEL,
		OwnerID:    obj.Owner.ID,
		ActorID:    personaID,
		ObjectID:   id,
	}
	if postType == models.PostTypeComment {
		if obj.ParentID == nil {
			return fmt.Errorf("comment %s has no parent", id)
		}
		parentType, err := r.objectType(ctx, *obj.ParentID)
		if err != nil {
			return err
		}
		event.Name = db.EventEnumComment
		event.TargetID = *obj.ParentID
		event.TargetType = eventTargetType(parentType)
	}

	now := time.Now()
	res, err := r.Objects.UpdateOne(ctx,
		bson.M{"id": id, "deletedat": nil},
		bson.M{"$set": bson.M{"deletedat": now, "updatedat": now}},
	)
	if err != nil {
		return fmt.Errorf("failed to delete object %s: %w", id, err)
	}
	if res.ModifiedCount == 0 {
		// Deleted by a concurrent request, which also did the rest.
		return errObjectNotFound
	}

	// Its own event and the likes on it. The object is gone already; a
	// failure here only leaves a counter one too high, so log instead of
	// reporting a failed delete.
	if _, err := r.Queries.SoftDeleteObjectEvents(ctx, id); err != nil {
		log.Printf("Warning: deleted %s but not its event: %v", id, err)
	}

	var streamName = nats.CONTENT_EVENTS_STREAM
	subjectHelper := subject.New(&streamName, obj.Owner, string(event.Name), string(event.Action))
	if err := r.NATS.PublishMessage(
		ctx,
		subjectHelper.GetSubject(),
		&nats.MessageType{Event: *models.EventMapper(event), Payload: map[string]any{"object_id": id}},
	); err != nil {
		log.Println("Warning: failed to publish delete event to NATS:", err)
	}
	return nil
}

// objectType returns the type of a post or comment, deleted or not.
func (r *Resolver) objectType(ctx context.Context, id string) (models.PostType, error) {
	var doc struct {
		Type models.PostType `bson:"type"`
	}
	err := r.Objects.FindOne(ctx, bson.M{"id": id}, options.FindOne().SetProjection(bson.M{"type": 1})).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return "", errObjectNotFound
	}
	if err != nil {
		return "", fmt.Errorf("failed to load object %s: %w", id, err)
	}
	return doc.Type, nil
}

// maxThreadDepth bounds threadPostID, so a corrupt parentid cycle can't loop
// forever.
const maxThreadDepth = 32

// threadPostID returns the id of the post at the top of obj's thread: obj
// itself for a post, else the post its chain of parents leads to.
func (r *Resolver) threadPostID(ctx context.Context, obj *models.PostGenericDocument) (string, error) {
	type ref struct {
		ID       string          `bson:"id"`
		Type     models.PostType `bson:"type"`
		ParentID *string         `bson:"parentid"`
	}
	cur := ref{ID: obj.ID, Type: obj.Type, ParentID: obj.ParentID}
	for range maxThreadDepth {
		if cur.Type == models.PostTypePost {
			return cur.ID, nil
		}
		if cur.ParentID == nil {
			return "", fmt.Errorf("comment %s has no parent", cur.ID)
		}
		parentID := *cur.ParentID
		cur = ref{}
		err := r.Objects.FindOne(ctx, bson.M{"id": parentID},
			options.FindOne().SetProjection(bson.M{"id": 1, "type": 1, "parentid": 1}),
		).Decode(&cur)
		if errors.Is(err, mongo.ErrNoDocuments) {
			return "", errObjectNotFound
		}
		if err != nil {
			return "", fmt.Errorf("failed to load object %s: %w", parentID, err)
		}
	}
	return "", fmt.Errorf("thread of %s is deeper than %d", obj.ID, maxThreadDepth)
}

// eventTargetType maps a stored object's type to the event target type.
func eventTargetType(t models.PostType) db.EventTargetTypeEnum {
	if t == models.PostTypePost {
		return db.EventTargetTypeEnumPOST
	}
	return db.EventTargetTypeEnumCOMMENT
}

func getPersonaIdFromContext(ctx context.Context) (int64, error) {
	ginCtx, ok := ctx.Value(keys.GinContextKey).(*gin.Context)
	if !ok {
		return 0, fmt.Errorf("failed to get gin.Context from context: %w", ctx.Err())
	}
	personaId, ok := ginCtx.Value("persona_id").(int64)
	if !ok {
		return 0, fmt.Errorf("failed to get personaId from context: %w", ctx.Err())
	}
	return personaId, nil
}

// resolvePersonas returns how viewerID sees each of ids in owner's content,
// real or anonymous.
func (r *Resolver) resolvePersonas(ctx context.Context, viewerID int64, owner *models.Owner, ids []int64) (map[int64]*models.Persona, error) {
	personas, err := r.visiblePersonas(ctx, viewerID, ids)
	if err != nil {
		return nil, err
	}
	for _, id := range ids {
		if personas[id] == nil {
			personas[id] = anonymousPersona(id, owner)
		}
	}
	return personas, nil
}

// visiblePersonas returns the real persona for each of ids viewerID sees, and
// leaves the others out. A cache hit is public, so it needs no visibility check.
func (r *Resolver) visiblePersonas(ctx context.Context, viewerID int64, ids []int64) (map[int64]*models.Persona, error) {
	personas := make(map[int64]*models.Persona, len(ids))
	seen := make(map[int64]bool, len(ids))
	var misses []int64
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		cached, err := r.Persona.GetPersonaInfo(ctx, strconv.FormatInt(id, 10))
		if err != nil {
			log.Println("redis get persona error:", err)
		}
		if cached == nil {
			misses = append(misses, id)
			continue
		}
		personas[id] = realPersona(cached.ID, cached.FirstName, cached.LastName, cached.Thumbnail.String)
	}

	if len(misses) > 0 {
		rows, err := r.Queries.ResolvePersonasForViewer(ctx, db.ResolvePersonasForViewerParams{
			Ids:      misses,
			ViewerID: viewerID,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to resolve personas: %w", err)
		}
		for _, row := range rows {
			_ = r.Persona.SetPersonaInfo(ctx, &db.ResolvePersonaByIDRow{
				ID:        row.ID,
				FirstName: row.FirstName,
				LastName:  row.LastName,
				Thumbnail: row.Thumbnail,
				Bio:       row.Bio,
				Slug:      row.Slug,
				Privacy:   row.Privacy,
			})
			if row.Visible {
				personas[row.ID] = realPersona(row.ID, row.FirstName, row.LastName, row.Thumbnail.String)
			}
		}
	}
	return personas, nil
}

// Anonymous names differ per channel and per wall.
func anonymousPersona(id int64, owner *models.Owner) *models.Persona {
	name := access.AnonymousName(id, owner.ID)
	if owner.Type == models.OwnerTypePersona {
		name = access.AnonymousWallName(id, owner.ID)
	}
	return &models.Persona{ID: id, Username: name, FullName: name, Anonymous: true}
}

func realPersona(id int64, firstName, lastName, thumbnail string) *models.Persona {
	name := firstName + " " + lastName
	return &models.Persona{
		ID:              id,
		Username:        name,
		FullName:        name,
		ProfileImageURL: &thumbnail,
	}
}

func (r *Resolver) resolvePostMetaCached(ctx context.Context, postID string) (*models.Meta, error) {
	cachedMeta, err := r.Content.GetPostMeta(ctx, postID)
	if err != nil {
		log.Println("redis get meta error:", err)
	}
	if cachedMeta != nil {
		return cachedMeta, nil
	}

	meta, err := counters.Count(ctx, r.Queries, postID)
	if err != nil {
		return nil, err
	}
	// Fill, not Set: never overwrite a newer recount from the redis worker.
	if err := r.Content.FillPostMeta(ctx, postID, meta); err != nil {
		log.Println("redis fill post meta error:", err)
	}
	return meta, nil
}

func getPosts(ctx context.Context, owner models.Owner, ids *[]string, r *queryResolver, limit int32, offset int32) ([]*models.Post, error) {
	posts := []*models.Post{}
	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	collection := r.Objects

	// limit value = 10 if not provided
	limitVal := int32(10)
	if limit != 0 {
		limitVal = limit
	}

	// offset value = 0 if not provided
	offsetVal := int32(0)
	if offset != 0 {
		offsetVal = offset
	}

	var pipeline = mongo.Pipeline{}
	pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{
		"owner.id":   owner.ID,
		"owner.type": owner.Type,
		"deletedat":  nil,
	}}})

	if ids != nil && len(*ids) > 0 {
		pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{
			"id": bson.M{"$in": *ids},
		}}})
	}

	pipeline = append(pipeline, []bson.D{
		{{Key: "$match", Value: bson.M{"type": models.PostTypePost}}},
		{{Key: "$sort", Value: bson.M{"createdat": -1}}},
		{{Key: "$skip", Value: offsetVal}},
		{{Key: "$limit", Value: limitVal}},
	}...)

	cursor, err := collection.Aggregate(ctxTimeout, pipeline)
	if err != nil {
		return nil, fmt.Errorf("aggregate posts failed: %w", err)
	}
	defer cursor.Close(ctxTimeout)
	resultsCount := cursor.RemainingBatchLength()
	// log results count
	fmt.Println("Fetching posts for channel:", owner.ID)
	fmt.Print(resultsCount)

	// Users Activity lookup (from Redis or Postgres)
	personaId, err := getPersonaIdFromContext(ctx)
	if err != nil || personaId == 0 {
		return nil, fmt.Errorf("failed to get personaId from context: %w", err)
	}

	for cursor.Next(ctxTimeout) {
		var p models.PostGenericDocument

		if err := cursor.Decode(&p); err != nil {
			return nil, fmt.Errorf("failed to decode post: %w", err)
		}
		post := models.PostMapper(&p)

		// post metadata lookup (from Redis or Postgres)
		meta, err := r.resolvePostMetaCached(ctx, p.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve post meta: %w", err)
		}
		post.Meta = meta
		posts = append(posts, post)
	}

	postIDs := make([]string, len(posts))
	authorIDs := make([]int64, len(posts))
	for i, post := range posts {
		postIDs[i] = post.ID
		authorIDs[i] = post.AuthorID
	}
	authors, err := r.resolvePersonas(ctx, personaId, &owner, authorIDs)
	if err != nil {
		return nil, err
	}
	for _, post := range posts {
		post.Author = authors[post.AuthorID]
	}
	liked, err := r.likedTargets(ctx, personaId, postIDs)
	if err != nil {
		return nil, err
	}
	for _, post := range posts {
		post.PersonalizedMeta = personalizedMeta(liked[post.ID])
	}

	return posts, nil
}

func getTotalPostsCountForChannel(ctx context.Context, channelID int64, r *queryResolver) (int32, error) {
	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	collection := r.Objects

	var pipeline = mongo.Pipeline{}
	pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{
		"owner.id":   channelID,
		"owner.type": models.OwnerTypeChannel,
		"deletedat":  nil,
	}}})

	pipeline = append(pipeline, []bson.D{
		{{Key: "$match", Value: bson.M{"type": models.PostTypePost}}},
		{{Key: "$count", Value: "total"}},
	}...)

	cursor, err := collection.Aggregate(ctxTimeout, pipeline)
	if err != nil {
		return 0, fmt.Errorf("aggregate posts count failed: %w", err)
	}
	defer cursor.Close(ctxTimeout)

	var total int32 = 0
	if cursor.Next(ctxTimeout) {
		var result struct {
			Total int32 `bson:"total"`
		}
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode total posts count: %w", err)
		}
		total = result.Total
	}

	return total, nil
}

func (r *Resolver) resolveCommentMetaCached(ctx context.Context, commentId string) (*models.Meta, error) {
	cachedMeta, err := r.Content.GetCommentMeta(ctx, commentId)
	if err != nil {
		log.Println("redis get meta error:", err)
	}
	if cachedMeta != nil {
		return cachedMeta, nil
	}

	meta, err := counters.Count(ctx, r.Queries, commentId)
	if err != nil {
		return nil, err
	}
	// Fill, not Set: never overwrite a newer recount from the redis worker.
	if err := r.Content.FillCommentMeta(ctx, commentId, meta); err != nil {
		log.Println("redis fill comment meta error:", err)
	}
	return meta, nil
}

func getComments(ctx context.Context, postID string, owner *models.Owner, r *queryResolver, limit int32, offset int32) ([]*models.Comment, error) {
	personaId, err := getPersonaIdFromContext(ctx)
	if err != nil || personaId == 0 {
		return nil, fmt.Errorf("failed to get personaId from context: %w", err)
	}
	comments := []*models.Comment{}
	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	collection := r.Objects

	// limit value = 10 if not provided
	limitVal := int32(10)
	if limit != 0 {
		limitVal = limit
	}

	// offset value = 0 if not provided
	offsetVal := int32(0)
	if offset != 0 {
		offsetVal = offset
	}

	var pipeline = mongo.Pipeline{}
	pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{
		"parentid":  postID,
		"deletedat": nil,
	}}})

	pipeline = append(pipeline, []bson.D{
		{{Key: "$match", Value: bson.M{"type": models.PostTypeComment}}},
		{{Key: "$sort", Value: bson.M{"createdat": 1}}},
		{{Key: "$skip", Value: offsetVal}},
		{{Key: "$limit", Value: limitVal}},
	}...)

	cursor, err := collection.Aggregate(ctxTimeout, pipeline)
	if err != nil {
		return nil, fmt.Errorf("aggregate posts failed: %w", err)
	}
	defer cursor.Close(ctxTimeout)

	for cursor.Next(ctxTimeout) {
		var commentsWithReplies models.PostGenericDocument
		if err := cursor.Decode(&commentsWithReplies); err != nil {
			return nil, fmt.Errorf("failed to decode comment: %w", err)
		}

		comment := models.CommentMapper(&commentsWithReplies)

		meta, err := r.resolveCommentMetaCached(ctx, commentsWithReplies.ID)
		if err != nil {
			return nil, err
		}
		comment.Meta = meta

		comments = append(comments, comment)
	}

	ids := make([]string, len(comments))
	authorIDs := make([]int64, len(comments))
	for i, comment := range comments {
		ids[i] = comment.ID
		authorIDs[i] = comment.AuthorID
	}
	authors, err := r.resolvePersonas(ctx, personaId, owner, authorIDs)
	if err != nil {
		return nil, err
	}
	for _, comment := range comments {
		comment.Author = authors[comment.AuthorID]
	}
	liked, err := r.likedTargets(ctx, personaId, ids)
	if err != nil {
		return nil, err
	}
	for _, comment := range comments {
		comment.PersonalizedMeta = personalizedMeta(liked[comment.ID])
	}

	return comments, nil
}

// likedTargets returns which of ids personaID currently likes, in one query
// per page (Postgres events are the source of truth).
func (r *Resolver) likedTargets(ctx context.Context, personaID int64, ids []string) (map[string]bool, error) {
	liked := make(map[string]bool, len(ids))
	if len(ids) == 0 {
		return liked, nil
	}
	rows, err := r.Queries.GetLikedTargets(ctx, db.GetLikedTargetsParams{
		ActorID:   personaID,
		TargetIds: ids,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to resolve liked targets: %w", err)
	}
	for _, id := range rows {
		liked[id] = true
	}
	return liked, nil
}

// personalizedMeta is the per-persona view of a post or comment.
func personalizedMeta(likedByPersona bool) *models.PersonalizedMeta {
	return &models.PersonalizedMeta{
		LikedByPersona: likedByPersona,
		ACL: &models.ACL{
			CanComment: true,            // Simplified for this example
			CanShare:   true,            // Simplified for this example
			CanView:    true,            // Simplified for this example
			CanReply:   true,            // Simplified for this example
			CanLike:    !likedByPersona, // Simplified for this example
		},
	}
}
