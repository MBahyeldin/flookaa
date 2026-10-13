package imaging

import (
	"errors"
	"log"

	"github.com/davidbyttow/govips/v2/vips"
)

var Widths = []int{320, 640, 1280, 1920}

var Formats = map[string]string{
	"webp": "image/webp",
	"jpeg": "image/jpeg",
	"png":  "image/png",
}

const maxPixels = 50_000_000

// ErrUseOriginal means the original file should be served instead.
var ErrUseOriginal = errors.New("serve the original")

// Bounds memory and CPU on the container.
var slots = make(chan struct{}, 2)

func Startup() error {
	vips.LoggingSettings(func(domain string, level vips.LogLevel, msg string) {
		log.Printf("vips %s: %s", domain, msg)
	}, vips.LogLevelWarning)
	return vips.Startup(&vips.Config{ConcurrencyLevel: 1, MaxCacheMem: 0, MaxCacheSize: 0, MaxCacheFiles: 0})
}

func Shutdown() { vips.Shutdown() }

// SnapWidth rounds w up to the next allowed width, capped at the largest.
func SnapWidth(w int) int {
	for _, allowed := range Widths {
		if w <= allowed {
			return allowed
		}
	}
	return Widths[len(Widths)-1]
}

// Resize returns data scaled to width and encoded as format ("" picks jpeg,
// or png when the image has transparency), with its file extension.
func Resize(data []byte, width int, format string) ([]byte, string, error) {
	slots <- struct{}{}
	defer func() { <-slots }()

	// Loading is lazy: this reads the header, not the pixels.
	head, err := vips.NewImageFromBuffer(data)
	if err != nil {
		return nil, "", ErrUseOriginal
	}
	pages, w, h, orient := head.Pages(), head.Width(), head.Height(), head.Orientation()
	head.Close()

	if orient >= 5 && orient <= 8 {
		w, h = h, w
	}
	if pages > 1 || w*h > maxPixels || width >= w {
		return nil, "", ErrUseOriginal
	}

	img, err := vips.NewThumbnailWithSizeFromBuffer(data, width, 100_000, vips.InterestingNone, vips.SizeDown)
	if err != nil {
		return nil, "", ErrUseOriginal
	}
	defer img.Close()

	if format == "" {
		format = "jpeg"
		if img.HasAlpha() {
			format = "png"
		}
	}

	var out []byte
	switch format {
	case "webp":
		out, _, err = img.ExportWebp(&vips.WebpExportParams{Quality: 80, ReductionEffort: 4, StripMetadata: true})
	case "jpeg":
		if img.HasAlpha() {
			if err := img.Flatten(&vips.Color{R: 255, G: 255, B: 255}); err != nil {
				return nil, "", err
			}
		}
		out, _, err = img.ExportJpeg(&vips.JpegExportParams{Quality: 82, Interlace: true, StripMetadata: true})
	case "png":
		out, _, err = img.ExportPng(&vips.PngExportParams{Compression: 6, StripMetadata: true})
	default:
		return nil, "", errors.New("unknown format " + format)
	}
	if err != nil {
		return nil, "", err
	}
	return out, format, nil
}
