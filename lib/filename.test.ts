import { describe, it, expect } from "vitest";
import { deriveFilename } from "./filename";

describe("deriveFilename", () => {
  it("slugifies a title and appends .md", () => {
    expect(deriveFilename("How React Works", "https://example.com/post")).toBe(
      "How-React-Works.md"
    );
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(deriveFilename("Hello, World!!", "https://x")).toBe("Hello-World.md");
  });

  it("strips leading and trailing hyphens after slugifying", () => {
    expect(deriveFilename("  ! ! ! Edge ! ! !  ", "https://x")).toBe("Edge.md");
  });

  it("uses host + path segments when the title is missing", () => {
    expect(deriveFilename(undefined, "https://example.com/blog/post")).toBe(
      "example.com-blog-post.md"
    );
  });

  it("uses host alone when the URL has no path", () => {
    expect(deriveFilename(undefined, "https://example.com")).toBe("example.com.md");
  });

  it("uses host + segments when title is an empty string", () => {
    expect(deriveFilename("", "https://example.com/a/b")).toBe("example.com-a-b.md");
  });

  it("falls back to a stable name when the URL cannot be parsed and there is no title", () => {
    expect(deriveFilename(undefined, "not-a-url")).toBe("article.md");
  });
});
