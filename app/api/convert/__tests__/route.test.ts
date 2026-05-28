import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import type { ConvertResponse } from "@/types/conversion";

const FIXTURE_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "artifacts",
  "url-to-markdown",
  "fixtures"
);

async function readFixture(name: string): Promise<string> {
  return readFile(path.join(FIXTURE_DIR, name), "utf8");
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/convert", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns title, author, and markdown for a normal article URL", async () => {
    const html = await readFixture("article.html");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(html, { status: 200 }))
    );

    const response = await POST(makeRequest({ url: "https://example.com/article" }));
    expect(response.status).toBe(200);

    const data = (await response.json()) as ConvertResponse;
    if ("kind" in data) {
      throw new Error(`expected success, got error: ${data.message}`);
    }
    expect(data.title).toBe("How React Works");
    expect(data.author).toBe("Jane Doe");
    expect(data.markdown).toMatch(/Reconciliation/);
    expect(data.url).toBe("https://example.com/article");
  });
});
