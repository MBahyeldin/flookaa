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

var interests = []db.SeedInterestParams{
	// Technology & Professional
	{Name: "Technology", Slug: "technology", Emoji: "💻", GroupSlug: "technology-professional"},
	{Name: "Programming", Slug: "programming", Emoji: "👨‍💻", GroupSlug: "technology-professional"},
	{Name: "Artificial Intelligence", Slug: "artificial-intelligence", Emoji: "🤖", GroupSlug: "technology-professional"},
	{Name: "Design", Slug: "design", Emoji: "🎨", GroupSlug: "technology-professional"},
	{Name: "Science", Slug: "science", Emoji: "🔬", GroupSlug: "technology-professional"},
	{Name: "Business", Slug: "business", Emoji: "💼", GroupSlug: "technology-professional"},
	{Name: "Startups", Slug: "startups", Emoji: "🚀", GroupSlug: "technology-professional"},
	{Name: "Personal Finance", Slug: "personal-finance", Emoji: "💰", GroupSlug: "technology-professional"},
	{Name: "Career & Productivity", Slug: "career-productivity", Emoji: "📈", GroupSlug: "technology-professional"},
	{Name: "Education", Slug: "education", Emoji: "📚", GroupSlug: "technology-professional"},

	// Entertainment & Media
	{Name: "Movies & TV", Slug: "movies-tv", Emoji: "🎬", GroupSlug: "entertainment-media"},
	{Name: "Music", Slug: "music", Emoji: "🎵", GroupSlug: "entertainment-media"},
	{Name: "Anime & Manga", Slug: "anime-manga", Emoji: "🍥", GroupSlug: "entertainment-media"},
	{Name: "Books & Reading", Slug: "books-reading", Emoji: "📖", GroupSlug: "entertainment-media"},
	{Name: "Writing", Slug: "writing", Emoji: "✍️", GroupSlug: "entertainment-media"},
	{Name: "Gaming", Slug: "gaming", Emoji: "🎮", GroupSlug: "entertainment-media"},
	{Name: "Memes & Humor", Slug: "memes-humor", Emoji: "😂", GroupSlug: "entertainment-media"},

	// Art & Creativity
	{Name: "Art", Slug: "art", Emoji: "🖼️", GroupSlug: "art-creativity"},
	{Name: "Photography", Slug: "photography", Emoji: "📸", GroupSlug: "art-creativity"},
	{Name: "Crafts & Handmade", Slug: "crafts-handmade", Emoji: "🧶", GroupSlug: "art-creativity"},

	// Lifestyle & Wellness
	{Name: "Fitness", Slug: "fitness", Emoji: "💪", GroupSlug: "lifestyle-wellness"},
	{Name: "Health & Wellness", Slug: "health-wellness", Emoji: "🌿", GroupSlug: "lifestyle-wellness"},
	{Name: "Fashion", Slug: "fashion", Emoji: "👗", GroupSlug: "lifestyle-wellness"},
	{Name: "Beauty", Slug: "beauty", Emoji: "💄", GroupSlug: "lifestyle-wellness"},
	{Name: "Home & DIY", Slug: "home-diy", Emoji: "🏡", GroupSlug: "lifestyle-wellness"},
	{Name: "Gardening", Slug: "gardening", Emoji: "🪴", GroupSlug: "lifestyle-wellness"},
	{Name: "Parenting", Slug: "parenting", Emoji: "👨‍👩‍👧", GroupSlug: "lifestyle-wellness"},
	{Name: "Relationships", Slug: "relationships", Emoji: "❤️", GroupSlug: "lifestyle-wellness"},
	{Name: "Lifestyle & Daily Life", Slug: "daily-life", Emoji: "☕", GroupSlug: "lifestyle-wellness"},

	// Food & Travel
	{Name: "Food", Slug: "food", Emoji: "🍽️", GroupSlug: "food-travel"},
	{Name: "Cooking", Slug: "cooking", Emoji: "👨‍🍳", GroupSlug: "food-travel"},
	{Name: "Travel", Slug: "travel", Emoji: "✈️", GroupSlug: "food-travel"},
	{Name: "Nature & Outdoors", Slug: "nature-outdoors", Emoji: "🏕️", GroupSlug: "food-travel"},
	{Name: "Animals", Slug: "animals", Emoji: "🦁", GroupSlug: "food-travel"},

	// Sports & Hobbies
	{Name: "Sports", Slug: "sports", Emoji: "⚽", GroupSlug: "sports-hobbies"},
	{Name: "Cars & Motorcycles", Slug: "cars-motorcycles", Emoji: "🏎️", GroupSlug: "sports-hobbies"},
	{Name: "Board Games", Slug: "board-games", Emoji: "🎲", GroupSlug: "sports-hobbies"},
	{Name: "Collecting", Slug: "collecting", Emoji: "🪙", GroupSlug: "sports-hobbies"},

	// Knowledge & Culture
	{Name: "History", Slug: "history", Emoji: "🏛️", GroupSlug: "knowledge-culture"},
	{Name: "Philosophy", Slug: "philosophy", Emoji: "💭", GroupSlug: "knowledge-culture"},
	{Name: "Languages & Culture", Slug: "languages-culture", Emoji: "🌍", GroupSlug: "knowledge-culture"},
	{Name: "Egyptian Culture", Slug: "egyptian-culture", Emoji: "🇪🇬", GroupSlug: "knowledge-culture"},
	{Name: "Arabic Language", Slug: "arabic-language", Emoji: "🗣️", GroupSlug: "knowledge-culture"},

	// Society & Community
	{Name: "News & Current Events", Slug: "news-current-events", Emoji: "📰", GroupSlug: "society-community"},
	{Name: "Politics", Slug: "politics", Emoji: "🏛️", GroupSlug: "society-community"},
	{Name: "Religion & Spirituality", Slug: "religion-spirituality", Emoji: "🕊️", GroupSlug: "society-community"},
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
