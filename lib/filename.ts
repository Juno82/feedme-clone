function slugify(input: string): string {
  return input
    .replace(/[^A-Za-z0-9가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fromUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }
  const host = parsed.hostname;
  const segments = parsed.pathname
    .split("/")
    .map((segment) => slugify(segment))
    .filter(Boolean);
  return [host, ...segments].filter(Boolean).join("-");
}

export function deriveFilename(title: string | undefined, url: string): string {
  const titleSlug = title ? slugify(title) : "";
  if (titleSlug) return `${titleSlug}.md`;

  const urlPart = fromUrl(url);
  if (urlPart) return `${urlPart}.md`;

  return "article.md";
}
