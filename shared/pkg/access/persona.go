package access

import (
	"context"
	"fmt"
	"hash/fnv"
	"shared/pkg/db"
)

func VisiblePersonas(ctx context.Context, q *db.Queries, viewerID int64, targetIDs []int64) (map[int64]bool, error) {
	visible := make(map[int64]bool, len(targetIDs))
	if len(targetIDs) == 0 {
		return visible, nil
	}
	rows, err := q.ResolvePersonasForViewer(ctx, db.ResolvePersonasForViewerParams{
		Ids:      targetIDs,
		ViewerID: viewerID,
	})
	if err != nil {
		return nil, fmt.Errorf("resolve personas for viewer: %w", err)
	}
	for _, row := range rows {
		visible[row.ID] = row.Visible
	}
	return visible, nil
}

var anonymousAdjectives = [...]string{
	"Quiet", "Brave", "Calm", "Clever", "Curious", "Gentle", "Happy", "Kind",
	"Lucky", "Merry", "Mellow", "Nimble", "Proud", "Shy", "Swift", "Wise",
	"Bright", "Bold", "Cozy", "Daring", "Eager", "Fancy", "Fuzzy", "Glad",
	"Jolly", "Lively", "Misty", "Noble", "Plucky", "Rosy", "Sunny", "Witty",
}

var anonymousAnimals = [...]string{
	"Otter", "Fox", "Owl", "Panda", "Koala", "Badger", "Heron", "Lynx",
	"Falcon", "Hedgehog", "Rabbit", "Turtle", "Dolphin", "Penguin", "Raccoon", "Squirrel",
	"Beaver", "Crane", "Deer", "Ferret", "Gecko", "Ibis", "Jaguar", "Lemur",
	"Marten", "Moose", "Puffin", "Quail", "Seal", "Swan", "Walrus", "Wren",
}

// AnonymousName is stable per persona and channel, e.g. "Quiet Otter 37".
func AnonymousName(personaID, channelID int64) string {
	h := fnv.New64a()
	fmt.Fprintf(h, "persona:%d:channel:%d", personaID, channelID)
	sum := h.Sum64()
	adjective := anonymousAdjectives[sum%uint64(len(anonymousAdjectives))]
	sum /= uint64(len(anonymousAdjectives))
	animal := anonymousAnimals[sum%uint64(len(anonymousAnimals))]
	sum /= uint64(len(anonymousAnimals))
	return fmt.Sprintf("%s %s %d", adjective, animal, 10+sum%90)
}
