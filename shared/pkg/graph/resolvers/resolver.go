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
	"shared/util/keys"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
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

// loadObject reads a post, comment or reply by id from app.objects.
func (r *Resolver) loadObject(ctx context.Context, id string) (*models.PostGenericDocument, error) {
	var doc models.PostGenericDocument
	err := r.Objects.FindOne(ctx, bson.M{"id": id}).Decode(&doc)
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

// authorizeOwner checks whether personaID may read (or write, when write is
// true) content owned by owner. Callers must pass the owner stored on the
// object, never the client's owner input, when the object already exists.
//
// Only channel-owned content is supported (rules in shared/pkg/access). Other
// owner types (PERSONA, PAGE) have no access rules yet, so they are refused
// rather than left open to every persona.
func (r *Resolver) authorizeOwner(ctx context.Context, owner *models.Owner, personaID int64, write bool) error {
	if owner == nil || owner.Type != models.OwnerTypeChannel {
		return errObjectNotFound
	}
	channel, err := access.LoadChannel(ctx, r.Queries, owner.ID, personaID)
	if err != nil {
		return err
	}
	if write {
		return channel.Write()
	}
	return channel.Read()
}

// eventTargetType maps a stored object's type to the event target type.
func eventTargetType(t models.PostType) db.EventTargetTypeEnum {
	if t == models.PostTypePost {
		return db.EventTargetTypeEnumPOST
	}
	return db.EventTargetTypeEnumCOMMENT
}

func getUserIdFromContext(ctx context.Context) (int64, error) {
	ginCtx, ok := ctx.Value(keys.GinContextKey).(*gin.Context)
	if !ok {
		return 0, fmt.Errorf("failed to get gin.Context from context: %w", ctx.Err())
	}
	userId, ok := ginCtx.Value("user_id").(int64)
	if !ok {
		return 0, fmt.Errorf("failed to get userId from context: %w", ctx.Err())
	}
	return userId, nil
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

func (r *Resolver) resolvePersonaCached(ctx context.Context, personaID int64) (*models.Persona, error) {
	cachedPersona, err := r.Persona.GetPersonaInfo(ctx, strconv.Itoa(int(personaID)))
	if err != nil {
		log.Println("redis get user error:", err)
	}
	if cachedPersona == nil {
		q := r.Queries
		persona, err := q.ResolvePersonaByID(ctx, personaID)
		if err != nil {
			return nil, fmt.Errorf("failed to get persona from postgres: %w", err)
		}
		cachedPersona = &persona
		_ = r.Persona.SetPersonaInfo(ctx, &persona)
	}
	return &models.Persona{
		ID:              cachedPersona.ID,
		Username:        cachedPersona.FirstName + " " + cachedPersona.LastName,
		FullName:        cachedPersona.FirstName + " " + cachedPersona.LastName,
		ProfileImageURL: &cachedPersona.Thumbnail.String,
	}, nil
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

		// Author lookup (from Redis or Postgres)
		author, err := r.resolvePersonaCached(ctx, p.AuthorID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve author: %w", err)
		}
		post.Author = author

		// post metadata lookup (from Redis or Postgres)
		meta, err := r.resolvePostMetaCached(ctx, p.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve post meta: %w", err)
		}
		post.Meta = meta
		posts = append(posts, post)
	}

	postIDs := make([]string, len(posts))
	for i, post := range posts {
		postIDs[i] = post.ID
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

func getComments(ctx context.Context, postID string, r *queryResolver, limit int32, offset int32) ([]*models.Comment, error) {
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
		"parentid": postID,
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

		// Author lookup (from Redis or Postgres)
		author, err := r.resolvePersonaCached(ctx, commentsWithReplies.AuthorID)
		if err != nil {
			return nil, err
		}

		comment := models.CommentMapper(&commentsWithReplies)
		comment.Author = author

		meta, err := r.resolveCommentMetaCached(ctx, commentsWithReplies.ID)
		if err != nil {
			return nil, err
		}
		comment.Meta = meta

		comments = append(comments, comment)
	}

	ids := make([]string, len(comments))
	for i, comment := range comments {
		ids[i] = comment.ID
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
