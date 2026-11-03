package seeder

import (
	"context"
	"database/sql"
	"log"
	"shared/pkg/db"
)

// The starting catalogue, in order. Existing rows (same slug, or same name in any case) are skipped.
var interestGroups = []db.SeedInterestGroupParams{
	{NameEn: "Technology & Professional", NameAr: ar("التقنية والعمل"), Slug: "technology-professional"},
	{NameEn: "Entertainment & Media", NameAr: ar("الترفيه والإعلام"), Slug: "entertainment-media"},
	{NameEn: "Art & Creativity", NameAr: ar("الفن والإبداع"), Slug: "art-creativity"},
	{NameEn: "Lifestyle & Wellness", NameAr: ar("أسلوب الحياة والعافية"), Slug: "lifestyle-wellness"},
	{NameEn: "Food & Travel", NameAr: ar("الطعام والسفر"), Slug: "food-travel"},
	{NameEn: "Sports & Hobbies", NameAr: ar("الرياضة والهوايات"), Slug: "sports-hobbies"},
	{NameEn: "Knowledge & Culture", NameAr: ar("المعرفة والثقافة"), Slug: "knowledge-culture"},
	{NameEn: "Society & Community", NameAr: ar("المجتمع"), Slug: "society-community"},
}

// Each interest is a variable so other seed data (communities) refers to it by name.
var (
	// Technology & Professional
	interestTechnology             = db.SeedInterestParams{NameEn: "Technology", NameAr: ar("التقنية"), Slug: "technology", Emoji: "💻", GroupSlug: "technology-professional"}
	interestProgramming            = db.SeedInterestParams{NameEn: "Programming", NameAr: ar("البرمجة"), Slug: "programming", Emoji: "👨‍💻", GroupSlug: "technology-professional"}
	interestArtificialIntelligence = db.SeedInterestParams{NameEn: "Artificial Intelligence", NameAr: ar("الذكاء الاصطناعي"), Slug: "artificial-intelligence", Emoji: "🤖", GroupSlug: "technology-professional"}
	interestDesign                 = db.SeedInterestParams{NameEn: "Design", NameAr: ar("التصميم"), Slug: "design", Emoji: "🎨", GroupSlug: "technology-professional"}
	interestScience                = db.SeedInterestParams{NameEn: "Science", NameAr: ar("العلوم"), Slug: "science", Emoji: "🔬", GroupSlug: "technology-professional"}
	interestBusiness               = db.SeedInterestParams{NameEn: "Business", NameAr: ar("الأعمال"), Slug: "business", Emoji: "💼", GroupSlug: "technology-professional"}
	interestStartups               = db.SeedInterestParams{NameEn: "Startups", NameAr: ar("الشركات الناشئة"), Slug: "startups", Emoji: "🚀", GroupSlug: "technology-professional"}
	interestPersonalFinance        = db.SeedInterestParams{NameEn: "Personal Finance", NameAr: ar("التمويل الشخصي"), Slug: "personal-finance", Emoji: "💰", GroupSlug: "technology-professional"}
	interestCareerProductivity     = db.SeedInterestParams{NameEn: "Career & Productivity", NameAr: ar("المسيرة المهنية والإنتاجية"), Slug: "career-productivity", Emoji: "📈", GroupSlug: "technology-professional"}
	interestEducation              = db.SeedInterestParams{NameEn: "Education", NameAr: ar("التعليم"), Slug: "education", Emoji: "📚", GroupSlug: "technology-professional"}

	// Entertainment & Media
	interestMoviesTV     = db.SeedInterestParams{NameEn: "Movies & TV", NameAr: ar("الأفلام والمسلسلات"), Slug: "movies-tv", Emoji: "🎬", GroupSlug: "entertainment-media"}
	interestMusic        = db.SeedInterestParams{NameEn: "Music", NameAr: ar("الموسيقى"), Slug: "music", Emoji: "🎵", GroupSlug: "entertainment-media"}
	interestAnimeManga   = db.SeedInterestParams{NameEn: "Anime & Manga", NameAr: ar("الأنمي والمانجا"), Slug: "anime-manga", Emoji: "🍥", GroupSlug: "entertainment-media"}
	interestBooksReading = db.SeedInterestParams{NameEn: "Books & Reading", NameAr: ar("الكتب والقراءة"), Slug: "books-reading", Emoji: "📖", GroupSlug: "entertainment-media"}
	interestWriting      = db.SeedInterestParams{NameEn: "Writing", NameAr: ar("الكتابة"), Slug: "writing", Emoji: "✍️", GroupSlug: "entertainment-media"}
	interestGaming       = db.SeedInterestParams{NameEn: "Gaming", NameAr: ar("ألعاب الفيديو"), Slug: "gaming", Emoji: "🎮", GroupSlug: "entertainment-media"}
	interestMemesHumor   = db.SeedInterestParams{NameEn: "Memes & Humor", NameAr: ar("الميمز والكوميديا"), Slug: "memes-humor", Emoji: "😂", GroupSlug: "entertainment-media"}

	// Art & Creativity
	interestArt            = db.SeedInterestParams{NameEn: "Art", NameAr: ar("الفن"), Slug: "art", Emoji: "🖼️", GroupSlug: "art-creativity"}
	interestPhotography    = db.SeedInterestParams{NameEn: "Photography", NameAr: ar("التصوير الفوتوغرافي"), Slug: "photography", Emoji: "📸", GroupSlug: "art-creativity"}
	interestCraftsHandmade = db.SeedInterestParams{NameEn: "Crafts & Handmade", NameAr: ar("الحِرف والمشغولات اليدوية"), Slug: "crafts-handmade", Emoji: "🧶", GroupSlug: "art-creativity"}

	// Lifestyle & Wellness
	interestFitness        = db.SeedInterestParams{NameEn: "Fitness", NameAr: ar("اللياقة البدنية"), Slug: "fitness", Emoji: "💪", GroupSlug: "lifestyle-wellness"}
	interestHealthWellness = db.SeedInterestParams{NameEn: "Health & Wellness", NameAr: ar("الصحة والعافية"), Slug: "health-wellness", Emoji: "🌿", GroupSlug: "lifestyle-wellness"}
	interestFashion        = db.SeedInterestParams{NameEn: "Fashion", NameAr: ar("الموضة"), Slug: "fashion", Emoji: "👗", GroupSlug: "lifestyle-wellness"}
	interestBeauty         = db.SeedInterestParams{NameEn: "Beauty", NameAr: ar("الجمال"), Slug: "beauty", Emoji: "💄", GroupSlug: "lifestyle-wellness"}
	interestHomeDIY        = db.SeedInterestParams{NameEn: "Home & DIY", NameAr: ar("المنزل والأعمال اليدوية"), Slug: "home-diy", Emoji: "🏡", GroupSlug: "lifestyle-wellness"}
	interestGardening      = db.SeedInterestParams{NameEn: "Gardening", NameAr: ar("البستنة"), Slug: "gardening", Emoji: "🪴", GroupSlug: "lifestyle-wellness"}
	interestParenting      = db.SeedInterestParams{NameEn: "Parenting", NameAr: ar("تربية الأطفال"), Slug: "parenting", Emoji: "👨‍👩‍👧", GroupSlug: "lifestyle-wellness"}
	interestRelationships  = db.SeedInterestParams{NameEn: "Relationships", NameAr: ar("العلاقات"), Slug: "relationships", Emoji: "❤️", GroupSlug: "lifestyle-wellness"}
	interestDailyLife      = db.SeedInterestParams{NameEn: "Lifestyle & Daily Life", NameAr: ar("أسلوب الحياة واليوميات"), Slug: "daily-life", Emoji: "☕", GroupSlug: "lifestyle-wellness"}

	// Food & Travel
	interestFood           = db.SeedInterestParams{NameEn: "Food", NameAr: ar("الطعام"), Slug: "food", Emoji: "🍽️", GroupSlug: "food-travel"}
	interestCooking        = db.SeedInterestParams{NameEn: "Cooking", NameAr: ar("الطبخ"), Slug: "cooking", Emoji: "👨‍🍳", GroupSlug: "food-travel"}
	interestTravel         = db.SeedInterestParams{NameEn: "Travel", NameAr: ar("السفر"), Slug: "travel", Emoji: "✈️", GroupSlug: "food-travel"}
	interestNatureOutdoors = db.SeedInterestParams{NameEn: "Nature & Outdoors", NameAr: ar("الطبيعة والرحلات الخلوية"), Slug: "nature-outdoors", Emoji: "🏕️", GroupSlug: "food-travel"}
	interestAnimals        = db.SeedInterestParams{NameEn: "Animals", NameAr: ar("الحيوانات"), Slug: "animals", Emoji: "🦁", GroupSlug: "food-travel"}

	// Sports & Hobbies
	interestSports          = db.SeedInterestParams{NameEn: "Sports", NameAr: ar("الرياضة"), Slug: "sports", Emoji: "⚽", GroupSlug: "sports-hobbies"}
	interestCarsMotorcycles = db.SeedInterestParams{NameEn: "Cars & Motorcycles", NameAr: ar("السيارات والدراجات النارية"), Slug: "cars-motorcycles", Emoji: "🏎️", GroupSlug: "sports-hobbies"}
	interestBoardGames      = db.SeedInterestParams{NameEn: "Board Games", NameAr: ar("ألعاب الطاولة"), Slug: "board-games", Emoji: "🎲", GroupSlug: "sports-hobbies"}
	interestCollecting      = db.SeedInterestParams{NameEn: "Collecting", NameAr: ar("جمع المقتنيات"), Slug: "collecting", Emoji: "🪙", GroupSlug: "sports-hobbies"}

	// Knowledge & Culture
	interestHistory          = db.SeedInterestParams{NameEn: "History", NameAr: ar("التاريخ"), Slug: "history", Emoji: "🏛️", GroupSlug: "knowledge-culture"}
	interestPhilosophy       = db.SeedInterestParams{NameEn: "Philosophy", NameAr: ar("الفلسفة"), Slug: "philosophy", Emoji: "💭", GroupSlug: "knowledge-culture"}
	interestLanguagesCulture = db.SeedInterestParams{NameEn: "Languages & Culture", NameAr: ar("اللغات والثقافات"), Slug: "languages-culture", Emoji: "🌍", GroupSlug: "knowledge-culture"}
	interestEgyptianCulture  = db.SeedInterestParams{NameEn: "Egyptian Culture", NameAr: ar("الثقافة المصرية"), Slug: "egyptian-culture", Emoji: "🇪🇬", GroupSlug: "knowledge-culture"}
	interestArabicLanguage   = db.SeedInterestParams{NameEn: "Arabic Language", NameAr: ar("اللغة العربية"), Slug: "arabic-language", Emoji: "🗣️", GroupSlug: "knowledge-culture"}

	// Society & Community
	interestNewsCurrentEvents    = db.SeedInterestParams{NameEn: "News & Current Events", NameAr: ar("الأخبار والأحداث الجارية"), Slug: "news-current-events", Emoji: "📰", GroupSlug: "society-community"}
	interestPolitics             = db.SeedInterestParams{NameEn: "Politics", NameAr: ar("السياسة"), Slug: "politics", Emoji: "🏛️", GroupSlug: "society-community"}
	interestReligionSpirituality = db.SeedInterestParams{NameEn: "Religion & Spirituality", NameAr: ar("الدين والروحانيات"), Slug: "religion-spirituality", Emoji: "🕊️", GroupSlug: "society-community"}
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
		if err := q.FillInterestGroupNameAr(ctx, db.FillInterestGroupNameArParams{Slug: group.Slug, NameAr: group.NameAr}); err != nil {
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
		if err := q.FillInterestNameAr(ctx, db.FillInterestNameArParams{Slug: interest.Slug, NameAr: interest.NameAr}); err != nil {
			log.Fatal(err)
		}
	}
}

func ar(name string) sql.NullString {
	return sql.NullString{String: name, Valid: true}
}
