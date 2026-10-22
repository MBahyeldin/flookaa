// Mirrors imaging.Widths in s3; s3 resizes /files/<key>?w= on request.
const variantWidths = [320, 640, 1280, 1920];
const s3Base = import.meta.env.VITE_S3_BUCKET_BASE_URL || "";

function isS3File(src: string) {
  const path = s3Base && src.startsWith(s3Base) ? src.slice(s3Base.length) : src;
  return /^\/files\/[^/?#]+$/.test(path);
}

// fraction is the share of the post column the image is drawn at.
// 56rem is the widest post column (the channel feed's max-w-4xl).
export function responsiveImage(src: string, width: number | undefined, fraction: number) {
  if (!isS3File(src)) return {};
  const widths = width === undefined ? variantWidths : variantWidths.filter((w) => w < width);
  const candidates = widths.map((w) => `${src}?w=${w}&fmt=webp ${w}w`);
  if (width !== undefined) candidates.push(`${src} ${width}w`);
  if (candidates.length < 2) return {};
  return {
    srcSet: candidates.join(", "),
    sizes: `(min-width: 56rem) ${fraction * 56}rem, ${fraction * 100}vw`,
  };
}
