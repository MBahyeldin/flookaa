package seeder

import (
	"app/internal/db/postgres/handlers/channels"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"shared/pkg/db"
)

const seedMinAge = 13

type seedChannel struct {
	Name        string
	Description string
	Interests   []db.SeedInterestParams
	Cover       db.CoverPatternEnum
}

type seedCommunity struct {
	Name        string
	Slug        string
	Description string
	Theme       db.ThemeEnum
	Cover       db.CoverPatternEnum
	Interests   []db.SeedInterestParams
	Channels    []seedChannel
}

// Skipped when the slug exists; a channel is skipped when its community already has one by that name.
var communities = []seedCommunity{
	{
		Name: "Tech Builders", Slug: "tech-builders",
		Theme: db.ThemeEnumSlate, Cover: db.CoverPatternEnumStripes,
		Description: "For people who build software, products and companies.",
		Interests:   []db.SeedInterestParams{interestTechnology, interestProgramming, interestStartups},
		Channels: []seedChannel{
			{"Programming Help", "Stuck on a bug? Ask here and help others.", []db.SeedInterestParams{interestProgramming}, db.CoverPatternEnumHorizon},
			{"AI Corner", "News, tools and experiments in artificial intelligence.", []db.SeedInterestParams{interestArtificialIntelligence}, db.CoverPatternEnumWaves},
			{"Startup Founders", "Building a company: ideas, launches and lessons.", []db.SeedInterestParams{interestStartups, interestBusiness}, db.CoverPatternEnumHills},
		},
	},
	{
		Name: "Screen & Sound", Slug: "screen-and-sound",
		Theme: db.ThemeEnumPlum, Cover: db.CoverPatternEnumWaves,
		Description: "Films, series, music and anime: what you're watching and listening to.",
		Interests:   []db.SeedInterestParams{interestMoviesTV, interestMusic, interestAnimeManga},
		Channels: []seedChannel{
			{"Movie Nights", "Recommendations, reviews and watch-alongs.", []db.SeedInterestParams{interestMoviesTV}, db.CoverPatternEnumStripes},
			{"Music Discovery", "Share the tracks and artists you love.", []db.SeedInterestParams{interestMusic}, db.CoverPatternEnumHorizon},
			{"Anime Club", "Seasonal picks, classics and manga talk.", []db.SeedInterestParams{interestAnimeManga}, db.CoverPatternEnumWaves},
		},
	},
	{
		Name: "Creators Hub", Slug: "creators-hub",
		Theme: db.ThemeEnumRose, Cover: db.CoverPatternEnumHills,
		Description: "A home for artists, photographers and writers.",
		Interests:   []db.SeedInterestParams{interestArt, interestPhotography, interestWriting},
		Channels: []seedChannel{
			{"Art Showcase", "Show your work and get feedback.", []db.SeedInterestParams{interestArt}, db.CoverPatternEnumHills},
			{"Photo Walk", "Photos, gear and technique.", []db.SeedInterestParams{interestPhotography}, db.CoverPatternEnumStripes},
			{"Writers' Room", "Drafts, prompts and the books that inspire you.", []db.SeedInterestParams{interestWriting, interestBooksReading}, db.CoverPatternEnumHorizon},
		},
	},
	{
		Name: "Healthy Living", Slug: "healthy-living",
		Theme: db.ThemeEnumForest, Cover: db.CoverPatternEnumHills,
		Description: "Moving, eating well and looking after your home.",
		Interests:   []db.SeedInterestParams{interestFitness, interestHealthWellness, interestCooking},
		Channels: []seedChannel{
			{"Fitness Journey", "Workouts, progress and motivation.", []db.SeedInterestParams{interestFitness}, db.CoverPatternEnumWaves},
			{"Cooking Together", "Recipes and kitchen wins.", []db.SeedInterestParams{interestCooking, interestFood}, db.CoverPatternEnumHills},
			{"Home & Garden", "DIY projects and green corners.", []db.SeedInterestParams{interestHomeDIY, interestGardening}, db.CoverPatternEnumStripes},
		},
	},
	{
		Name: "Explorers", Slug: "explorers",
		Theme: db.ThemeEnumTide, Cover: db.CoverPatternEnumHorizon,
		Description: "Travel, the outdoors and the animals we meet there.",
		Interests:   []db.SeedInterestParams{interestTravel, interestNatureOutdoors, interestAnimals},
		Channels: []seedChannel{
			{"Travel Stories", "Trips, tips and places worth seeing.", []db.SeedInterestParams{interestTravel}, db.CoverPatternEnumHorizon},
			{"Into the Wild", "Hikes, camping and wildlife.", []db.SeedInterestParams{interestNatureOutdoors, interestAnimals}, db.CoverPatternEnumWaves},
		},
	},
	{
		Name: "Game Night", Slug: "game-night",
		Theme: db.ThemeEnumEmber, Cover: db.CoverPatternEnumStripes,
		Description: "Video games and board games, solo or together.",
		Interests:   []db.SeedInterestParams{interestGaming, interestBoardGames},
		Channels: []seedChannel{
			{"Gamers Lounge", "What you're playing and who to play with.", []db.SeedInterestParams{interestGaming}, db.CoverPatternEnumHills},
			{"Board Game Café", "Favourites, rules questions and game nights.", []db.SeedInterestParams{interestBoardGames}, db.CoverPatternEnumStripes},
		},
	},
	{
		Name: "Egypt & Arabic", Slug: "egypt-and-arabic",
		Theme: db.ThemeEnumEmber, Cover: db.CoverPatternEnumHorizon,
		Description: "Egyptian culture, history and the Arabic language.",
		Interests:   []db.SeedInterestParams{interestEgyptianCulture, interestArabicLanguage, interestHistory},
		Channels: []seedChannel{
			{"Egyptian Culture", "Traditions, history and everyday life in Egypt.", []db.SeedInterestParams{interestEgyptianCulture, interestHistory}, db.CoverPatternEnumHorizon},
			{"Learn Arabic", "Practise and ask questions, at any level.", []db.SeedInterestParams{interestArabicLanguage}, db.CoverPatternEnumWaves},
		},
	},
}

func SeedCommunities(pg *sql.DB, q *db.Queries, adminEmail string) {
	ctx := context.Background()
	user, err := q.GetUserHashedPasswordByEmail(ctx, adminEmail)
	if err != nil {
		log.Fatal(err)
	}
	owner, err := q.GetDefaultPersonaByUserId(ctx, user.ID)
	if err != nil {
		log.Fatal(err)
	}
	for _, sc := range communities {
		if err := seedOneCommunity(ctx, pg, q, owner.ID, sc); err != nil {
			log.Fatalf("seed community %s: %v", sc.Slug, err)
		}
	}
}

func seedOneCommunity(ctx context.Context, pg *sql.DB, q *db.Queries, ownerID int64, sc seedCommunity) error {
	communityID, err := seedCommunityRow(ctx, pg, q, ownerID, sc)
	if err != nil {
		return err
	}
	for _, ch := range sc.Channels {
		_, err := q.GetCommunityChannelIDByName(ctx, db.GetCommunityChannelIDByNameParams{CommunityID: communityID, Name: ch.Name})
		if err == nil {
			continue
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		ids, err := interestIDs(ctx, q, ch.Interests)
		if err != nil {
			return err
		}
		if _, err := channels.Create(ctx, pg, q, channels.CreateParams{
			Name:         ch.Name,
			Description:  ch.Description,
			Visibility:   db.ChannelVisibilityEnumPublic,
			OwnerID:      ownerID,
			MinAge:       seedMinAge,
			CoverPattern: ch.Cover,
			InterestIDs:  ids,
			CommunityID:  communityID,
		}); err != nil {
			return fmt.Errorf("channel %s: %w", ch.Name, err)
		}
	}
	return nil
}

func seedCommunityRow(ctx context.Context, pg *sql.DB, q *db.Queries, ownerID int64, sc seedCommunity) (int64, error) {
	existing, err := q.GetCommunityBySlug(ctx, sc.Slug)
	if err == nil {
		return existing.Community.ID, seedCommunityLook(ctx, q, existing.Community, sc)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	ids, err := interestIDs(ctx, q, sc.Interests)
	if err != nil {
		return 0, err
	}

	tx, err := pg.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	qtx := q.WithTx(tx)
	communityID, err := qtx.CreateCommunity(ctx, db.CreateCommunityParams{
		Name:         sc.Name,
		Slug:         sc.Slug,
		Description:  sc.Description,
		Visibility:   db.CommunityVisibilityEnumPublic,
		OwnerID:      ownerID,
		MinAge:       seedMinAge,
		Theme:        sc.Theme,
		CoverPattern: sc.Cover,
	})
	if err != nil {
		return 0, err
	}
	if err := qtx.ReplaceCommunityInterests(ctx, db.ReplaceCommunityInterestsParams{CommunityID: communityID, Ids: ids}); err != nil {
		return 0, err
	}
	return communityID, tx.Commit()
}

// Rows from before migration 034 got the column defaults; only those are given the seed's look,
// so a manager's own choice is never overwritten.
func seedCommunityLook(ctx context.Context, q *db.Queries, c db.Community, sc seedCommunity) error {
	if c.Theme != db.ThemeEnumTide || c.CoverPattern != db.CoverPatternEnumHorizon {
		return nil
	}
	if sc.Theme == c.Theme && sc.Cover == c.CoverPattern {
		return nil
	}
	_, err := q.UpdateCommunity(ctx, db.UpdateCommunityParams{
		ID:           c.ID,
		Theme:        db.NullThemeEnum{ThemeEnum: sc.Theme, Valid: true},
		CoverPattern: db.NullCoverPatternEnum{CoverPatternEnum: sc.Cover, Valid: true},
	})
	return err
}

// Every seeded interest exists once SeedInterests has run, so a miss is an error.
func interestIDs(ctx context.Context, q *db.Queries, seeded []db.SeedInterestParams) ([]int64, error) {
	slugs := make([]string, len(seeded))
	for i, interest := range seeded {
		slugs[i] = interest.Slug
	}
	ids, err := q.GetInterestIDsBySlugs(ctx, slugs)
	if err != nil {
		return nil, err
	}
	if len(ids) != len(slugs) {
		return nil, fmt.Errorf("unknown interest in %v", slugs)
	}
	return ids, nil
}
