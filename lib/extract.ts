import { Defuddle } from "defuddle/node";
import type { ConvertSuccess } from "@/types/conversion";

export async function extractFromHtml(
  html: string,
  sourceUrl: string
): Promise<ConvertSuccess> {
  const result = await Defuddle(html, sourceUrl, { markdown: true });

  const markdown = (result.content ?? "").trim();
  const title = result.title?.trim() || undefined;
  const author = result.author?.trim() || undefined;

  return {
    url: sourceUrl,
    title,
    author,
    markdown,
  };
}
