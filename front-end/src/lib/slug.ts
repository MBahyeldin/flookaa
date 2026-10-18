// Same rule as backend/internal/slug.
export const SLUG_PATTERN = /^(?=.{3,50}$)[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}
