import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { extractFromHtml } from "./extract";

const FIXTURE_DIR = path.resolve(
  __dirname,
  "..",
  "artifacts",
  "url-to-markdown",
  "fixtures"
);

async function readFixture(name: string): Promise<string> {
  return readFile(path.join(FIXTURE_DIR, name), "utf8");
}

describe("extractFromHtml", () => {
  it("extracts title, author, and markdown from a normal article", async () => {
    const html = await readFixture("article.html");
    const result = await extractFromHtml(html, "https://example.com/article");

    expect(result.url).toBe("https://example.com/article");
    expect(result.title).toBe("How React Works");
    expect(result.author).toBe("Jane Doe");
    expect(result.markdown).toMatch(/Reconciliation/);
    expect(result.markdown).toMatch(/Commit Phase/);
    expect(result.markdown.length).toBeGreaterThan(50);
  });

  it("returns undefined title and author when the page has no metadata", async () => {
    const html = await readFixture("no-meta.html");
    const result = await extractFromHtml(html, "https://example.com/anon");

    expect(result.title).toBeUndefined();
    expect(result.author).toBeUndefined();
    expect(result.markdown.length).toBeGreaterThan(50);
    expect(result.url).toBe("https://example.com/anon");
  });
});
