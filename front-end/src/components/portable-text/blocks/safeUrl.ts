// Same rule as safeURL in shared/util/portableText/block-objects/urls.go.
export function safeUrl(raw: string, schemes: string[]): boolean {
  if (raw === "" || raw !== raw.trim()) return false;
  if (raw.startsWith("/")) {
    return !raw.startsWith("//") && !raw.startsWith("/\\");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  const scheme = url.protocol.slice(0, -1).toLowerCase();
  if (!schemes.includes(scheme)) return false;
  return scheme === "mailto" || url.host !== "";
}
