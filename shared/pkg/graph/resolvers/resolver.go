package models

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"shared/external/db/redis"
	"shared/pkg/db"
	"shared/pkg/graph"
	"shared/pkg/graph/directives"
	"shared/pkg/graph/models"
	"shared/util/keys"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func NewExecutableSchema(cfg graph.Config) graphql.ExecutableSchema {
	cfg.Directives.Oneof = directives.Oneof
	return graph.NewExecutableSchema(cfg)
}

type Resolver struct {
	Postgres *sql.DB
	Mongo    *mongo.Client
	Neo4j    neo4j.DriverWithContext
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

func resolveUserCached(ctx context.Context, userID int64, pg *sql.DB) (*models.User, error) {
	cachedUser, err := redis.Store.User.GetUserInfo(ctx, strconv.Itoa(int(userID)))
	if err != nil {
		log.Println("redis get user error:", err)
	}
	if cachedUser == nil {
		q := db.New(pg)
		user, err := q.ResolveUserByID(ctx, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to get user from postgres: %w", err)
		}
		cachedUser = &user
		_ = redis.Store.User.SetUserInfo(ctx, &user)
	}
	return &models.User{
		ID:              cachedUser.ID,
		Username:        cachedUser.FirstName + " " + cachedUser.LastName,
		FullName:        cachedUser.FirstName + " " + cachedUser.LastName,
		ProfileImageURL: &cachedUser.Thumbnail.String,
	}, nil
}

func resolvePostMetaCached(ctx context.Context, postID string, pg *sql.DB) (*models.Meta, error) {
	cachedMeta, err := redis.Store.Content.GetPostMeta(ctx, postID)
	if err != nil {
		log.Println("redis get meta error:", err)
	}

	if cachedMeta == nil {
		q := db.New(pg)
		postEvents, err := q.GetMetaFromEvents(ctx, postID)
		if err != nil {
			return nil, fmt.Errorf("failed to get post events from postgres: %w", err)
		}

		likesEventsCount := int32(0)
		commentsEventsCount := int32(0)
		sharesEventsCount := int32(0)
		for _, event := range postEvents {
			switch event.Name {
			case db.EventEnumLike:
				likesEventsCount = int32(event.Count)
			case db.EventEnumComment:
				commentsEventsCount = int32(event.Count)
			}
		}

		cachedMeta = &models.Meta{
			LikesCount:    likesEventsCount,
			CommentsCount: &commentsEventsCount,
			SharesCount:   sharesEventsCount,
		}
		err = redis.Store.Content.SetPostMeta(ctx, postID, cachedMeta)
		if err != nil {
			fmt.Println("redis set meta error:", err)
			return nil, fmt.Errorf("failed to set post meta in redis: %w", err)
		}
	}
	return cachedMeta, nil
}

func getPosts(ctx context.Context, owner models.Owner, ids *[]string, r *queryResolver, limit int32, offset int32) ([]*models.Post, error) {
	posts := []*models.Post{}
	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	collection := r.Mongo.Database("app").Collection("objects")

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
	userId, err := getUserIdFromContext(ctx)
	if err != nil || userId == 0 {
		return nil, fmt.Errorf("failed to get userId from context: %w", err)
	}

	// this should not be here in production, should be done at login or some other place
	// but for simplicity, we do it here
	// ensure user activities are cached in Redis
	err = redis.Store.User.InitUserActivityIfNotSet(ctx, userId, r.Postgres)
	if err != nil {
		return nil, fmt.Errorf("failed to get init activities: %w", err)
	}

	for cursor.Next(ctxTimeout) {
		var p models.PostGenericDocument

		if err := cursor.Decode(&p); err != nil {
			return nil, fmt.Errorf("failed to decode post: %w", err)
		}
		post := models.PostMapper(&p)

		// Author lookup (from Redis or Postgres)
		author, err := resolveUserCached(ctx, p.AuthorID, r.Postgres)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve author: %w", err)
		}
		post.Author = author

		// post metadata lookup (from Redis or Postgres)
		meta, err := resolvePostMetaCached(ctx, p.ID, r.Postgres)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve post meta: %w", err)
		}
		post.Meta = meta

		isLikedByMe, err := redis.Store.User.IsUserActivity(ctx, userId, p.ID, db.EventEnumLike)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve if post is liked by me: %w", err)
		}

		// post Meta personalization (based on current user activities)
		personalizedMeta := &models.PersonalizedMeta{
			LikedByUser: isLikedByMe,
			ACL: &models.ACL{
				CanComment: true,                 // Simplified for this example
				CanShare:   true,                 // Simplified for this example
				CanView:    true,                 // Simplified for this example
				CanReply:   true,                 // Simplified for this example
				CanLike:    true && !isLikedByMe, // Simplified for this example
			},
		}
		post.PersonalizedMeta = personalizedMeta
		posts = append(posts, post)

	}

	return posts, nil
}

func getTotalPostsCountForChannel(ctx context.Context, channelID int64, r *queryResolver) (int32, error) {
	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	collection := r.Mongo.Database("app").Collection("objects")

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

func resolveCommentMetaCached(ctx context.Context, commentId string, pg *sql.DB) (*models.Meta, error) {
	cachedMeta, err := redis.Store.Content.GetCommentMeta(ctx, commentId)
	if err != nil {
		log.Println("redis get meta error:", err)
	}

	if cachedMeta == nil {
		log.Println("Comment meta not found in cache, fetching from Postgres")
		q := db.New(pg)
		metaEvents, err := q.GetMetaFromEvents(ctx, commentId)
		if err != nil {
			return nil, fmt.Errorf("failed to get post events from postgres: %w", err)
		}

		likesEventsCount := int32(0)
		repliesEventsCount := int32(0)
		sharesEventsCount := int32(0)
		for _, event := range metaEvents {
			switch event.Name {
			case db.EventEnumLike:
				likesEventsCount = int32(event.Count)
			case db.EventEnumComment:
				repliesEventsCount = int32(event.Count)
			}
		}

		log.Println("Fetched comment meta from Postgres:", likesEventsCount, repliesEventsCount, sharesEventsCount)

		cachedMeta = &models.Meta{
			LikesCount:    likesEventsCount,
			CommentsCount: &repliesEventsCount,
			SharesCount:   sharesEventsCount,
		}
		err = redis.Store.Content.SetCommentMeta(ctx, commentId, cachedMeta)
		if err != nil {
			fmt.Println("redis set meta error:", err)
			return nil, fmt.Errorf("failed to set comment meta in redis: %w", err)
		}
	}

	return cachedMeta, nil
}

func getComments(ctx context.Context, postID string, r *queryResolver, limit int32, offset int32) ([]*models.Comment, error) {
	userId, err := getUserIdFromContext(ctx)
	if err != nil || userId == 0 {
		return nil, fmt.Errorf("failed to get userId from context: %w", err)
	}
	comments := []*models.Comment{}
	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	collection := r.Mongo.Database("app").Collection("objects")

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
		author, err := resolveUserCached(ctx, commentsWithReplies.AuthorID, r.Postgres)
		if err != nil {
			return nil, err
		}

		comment := models.CommentMapper(&commentsWithReplies)
		comment.Author = author

		meta, err := resolveCommentMetaCached(ctx, commentsWithReplies.ID, r.Postgres)
		if err != nil {
			return nil, err
		}
		comment.Meta = meta

		isLikedByMe, err := redis.Store.User.IsUserActivity(ctx, userId, comment.ID, db.EventEnumLike)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve if post is liked by me: %w", err)
		}

		// post Meta personalization (based on current user activities)
		personalizedMeta := &models.PersonalizedMeta{
			LikedByUser: isLikedByMe,
			ACL: &models.ACL{
				CanComment: true,                 // Simplified for this example
				CanShare:   true,                 // Simplified for this example
				CanView:    true,                 // Simplified for this example
				CanReply:   true,                 // Simplified for this example
				CanLike:    true && !isLikedByMe, // Simplified for this example
			},
		}
		comment.PersonalizedMeta = personalizedMeta

		comments = append(comments, comment)
	}

	return comments, nil
}
