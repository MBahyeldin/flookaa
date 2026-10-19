package seeder

import (
	"context"
	"log"
	"shared/pkg/db"
)

// The starting catalogue, in order. Existing rows (same slug, or same name in any case) are skipped.
var interestGroups = []db.SeedInterestGroupParams{
	{Name: "Technology & Professional", Slug: "technology-professional"},
	{Name: "Entertainment & Media", Slug: "entertainment-media"},
	{Name: "Art & Creativity", Slug: "art-creativity"},
	{Name: "Lifestyle & Wellness", Slug: "lifestyle-wellness"},
	{Name: "Food & Travel", Slug: "food-travel"},
	{Name: "Sports & Hobbies", Slug: "sports-hobbies"},
	{Name: "Knowledge & Culture", Slug: "knowledge-culture"},
	{Name: "Society & Community", Slug: "society-community"},
}

// Each interest is a variable so other seed data (communities) refers to it by name.
var (
	// Technology & Professional
	interestTechnology             = db.SeedInterestParams{Name: "Technology", Slug: "technology", Emoji: "💻", GroupSlug: "technology-professional"}
	interestProgramming            = db.SeedInterestParams{Name: "Programming", Slug: "programming", Emoji: "👨‍💻", GroupSlug: "technology-professional"}
	interestArtificialIntelligence = db.SeedInterestParams{Name: "Artificial Intelligence", Slug: "artificial-intelligence", Emoji: "🤖", GroupSlug: "technology-professional"}
	interestDesign                 = db.SeedInterestParams{Name: "Design", Slug: "design", Emoji: "🎨", GroupSlug: "technology-professional"}
	interestScience                = db.SeedInterestParams{Name: "Science", Slug: "science", Emoji: "🔬", GroupSlug: "technology-professional"}
	interestBusiness               = db.SeedInterestParams{Name: "Business", Slug: "business", Emoji: "💼", GroupSlug: "technology-professional"}
	interestStartups               = db.SeedInterestParams{Name: "Startups", Slug: "startups", Emoji: "🚀", GroupSlug: "technology-professional"}
	interestPersonalFinance        = db.SeedInterestParams{Name: "Personal Finance", Slug: "personal-finance", Emoji: "💰", GroupSlug: "technology-professional"}
	interestCareerProductivity     = db.SeedInterestParams{Name: "Career & Productivity", Slug: "career-productivity", Emoji: "📈", GroupSlug: "technology-professional"}
	interestEducation              = db.SeedInterestParams{Name: "Education", Slug: "education", Emoji: "📚", GroupSlug: "technology-professional"}

	// Entertainment & Media
	interestMoviesTV     = db.SeedInterestParams{Name: "Movies & TV", Slug: "movies-tv", Emoji: "🎬", GroupSlug: "entertainment-media"}
	interestMusic        = db.SeedInterestParams{Name: "Music", Slug: "music", Emoji: "🎵", GroupSlug: "entertainment-media"}
	interestAnimeManga   = db.SeedInterestParams{Name: "Anime & Manga", Slug: "anime-manga", Emoji: "🍥", GroupSlug: "entertainment-media"}
	interestBooksReading = db.SeedInterestParams{Name: "Books & Reading", Slug: "books-reading", Emoji: "📖", GroupSlug: "entertainment-media"}
	interestWriting      = db.SeedInterestParams{Name: "Writing", Slug: "writing", Emoji: "✍️", GroupSlug: "entertainment-media"}
	interestGaming       = db.SeedInterestParams{Name: "Gaming", Slug: "gaming", Emoji: "🎮", GroupSlug: "entertainment-media"}
	interestMemesHumor   = db.SeedInterestParams{Name: "Memes & Humor", Slug: "memes-humor", Emoji: "😂", GroupSlug: "entertainment-media"}

	// Art & Creativity
	interestArt            = db.SeedInterestParams{Name: "Art", Slug: "art", Emoji: "🖼️", GroupSlug: "art-creativity"}
	interestPhotography    = db.SeedInterestParams{Name: "Photography", Slug: "photography", Emoji: "📸", GroupSlug: "art-creativity"}
	interestCraftsHandmade = db.SeedInterestParams{Name: "Crafts & Handmade", Slug: "crafts-handmade", Emoji: "🧶", GroupSlug: "art-creativity"}

	// Lifestyle & Wellness
	interestFitness        = db.SeedInterestParams{Name: "Fitness", Slug: "fitness", Emoji: "💪", GroupSlug: "lifestyle-wellness"}
	interestHealthWellness = db.SeedInterestParams{Name: "Health & Wellness", Slug: "health-wellness", Emoji: "🌿", GroupSlug: "lifestyle-wellness"}
	interestFashion        = db.SeedInterestParams{Name: "Fashion", Slug: "fashion", Emoji: "👗", GroupSlug: "lifestyle-wellness"}
	interestBeauty         = db.SeedInterestParams{Name: "Beauty", Slug: "beauty", Emoji: "💄", GroupSlug: "lifestyle-wellness"}
	interestHomeDIY        = db.SeedInterestParams{Name: "Home & DIY", Slug: "home-diy", Emoji: "🏡", GroupSlug: "lifestyle-wellness"}
	interestGardening      = db.SeedInterestParams{Name: "Gardening", Slug: "gardening", Emoji: "🪴", GroupSlug: "lifestyle-wellness"}
	interestParenting      = db.SeedInterestParams{Name: "Parenting", Slug: "parenting", Emoji: "👨‍👩‍👧", GroupSlug: "lifestyle-wellness"}
	interestRelationships  = db.SeedInterestParams{Name: "Relationships", Slug: "relationships", Emoji: "❤️", GroupSlug: "lifestyle-wellness"}
	interestDailyLife      = db.SeedInterestParams{Name: "Lifestyle & Daily Life", Slug: "daily-life", Emoji: "☕", GroupSlug: "lifestyle-wellness"}

	// Food & Travel
	interestFood           = db.SeedInterestParams{Name: "Food", Slug: "food", Emoji: "🍽️", GroupSlug: "food-travel"}
	interestCooking        = db.SeedInterestParams{Name: "Cooking", Slug: "cooking", Emoji: "👨‍🍳", GroupSlug: "food-travel"}
	interestTravel         = db.SeedInterestParams{Name: "Travel", Slug: "travel", Emoji: "✈️", GroupSlug: "food-travel"}
	interestNatureOutdoors = db.SeedInterestParams{Name: "Nature & Outdoors", Slug: "nature-outdoors", Emoji: "🏕️", GroupSlug: "food-travel"}
	interestAnimals        = db.SeedInterestParams{Name: "Animals", Slug: "animals", Emoji: "🦁", GroupSlug: "food-travel"}

	// Sports & Hobbies
	interestSports          = db.SeedInterestParams{Name: "Sports", Slug: "sports", Emoji: "⚽", GroupSlug: "sports-hobbies"}
	interestCarsMotorcycles = db.SeedInterestParams{Name: "Cars & Motorcycles", Slug: "cars-motorcycles", Emoji: "🏎️", GroupSlug: "sports-hobbies"}
	interestBoardGames      = db.SeedInterestParams{Name: "Board Games", Slug: "board-games", Emoji: "🎲", GroupSlug: "sports-hobbies"}
	interestCollecting      = db.SeedInterestParams{Name: "Collecting", Slug: "collecting", Emoji: "🪙", GroupSlug: "sports-hobbies"}

	// Knowledge & Culture
	interestHistory          = db.SeedInterestParams{Name: "History", Slug: "history", Emoji: "🏛️", GroupSlug: "knowledge-culture"}
	interestPhilosophy       = db.SeedInterestParams{Name: "Philosophy", Slug: "philosophy", Emoji: "💭", GroupSlug: "knowledge-culture"}
	interestLanguagesCulture = db.SeedInterestParams{Name: "Languages & Culture", Slug: "languages-culture", Emoji: "🌍", GroupSlug: "knowledge-culture"}
	interestEgyptianCulture  = db.SeedInterestParams{Name: "Egyptian Culture", Slug: "egyptian-culture", Emoji: "🇪🇬", GroupSlug: "knowledge-culture"}
	interestArabicLanguage   = db.SeedInterestParams{Name: "Arabic Language", Slug: "arabic-language", Emoji: "🗣️", GroupSlug: "knowledge-culture"}

	// Society & Community
	interestNewsCurrentEvents    = db.SeedInterestParams{Name: "News & Current Events", Slug: "news-current-events", Emoji: "📰", GroupSlug: "society-community"}
	interestPolitics             = db.SeedInterestParams{Name: "Politics", Slug: "politics", Emoji: "🏛️", GroupSlug: "society-community"}
	interestReligionSpirituality = db.SeedInterestParams{Name: "Religion & Spirituality", Slug: "religion-spirituality", Emoji: "🕊️", GroupSlug: "society-community"}
)

var interests = []db.SeedInterestParams{
	// Technology & Professional
	interestTechnology,
	interestProgramming,
	interestArtificialIntelligence,
	interestDesign,
	interestScience,
	interestBusiness,
	interestStartups,
	interestPersonalFinance,
	interestCareerProductivity,
	interestEducation,

	// Entertainment & Media
	interestMoviesTV,
	interestMusic,
	interestAnimeManga,
	interestBooksReading,
	interestWriting,
	interestGaming,
	interestMemesHumor,

	// Art & Creativity
	interestArt,
	interestPhotography,
	interestCraftsHandmade,

	// Lifestyle & Wellness
	interestFitness,
	interestHealthWellness,
	interestFashion,
	interestBeauty,
	interestHomeDIY,
	interestGardening,
	interestParenting,
	interestRelationships,
	interestDailyLife,

	// Food & Travel
	interestFood,
	interestCooking,
	interestTravel,
	interestNatureOutdoors,
	interestAnimals,

	// Sports & Hobbies
	interestSports,
	interestCarsMotorcycles,
	interestBoardGames,
	interestCollecting,

	// Knowledge & Culture
	interestHistory,
	interestPhilosophy,
	interestLanguagesCulture,
	interestEgyptianCulture,
	interestArabicLanguage,

	// Society & Community
	interestNewsCurrentEvents,
	interestPolitics,
	interestReligionSpirituality,
}

func SeedInterests(q *db.Queries) {
	ctx := context.Background()
	for _, group := range interestGroups {
		if err := q.SeedInterestGroup(ctx, group); err != nil {
			log.Fatal(err)
		}
	}
	for _, interest := range interests {
		if err := q.SeedInterest(ctx, interest); err != nil {
			log.Fatal(err)
		}
		if err := q.FillInterestGroup(ctx, db.FillInterestGroupParams{Slug: interest.Slug, GroupSlug: interest.GroupSlug}); err != nil {
			log.Fatal(err)
		}
	}
}
