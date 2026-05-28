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

  it("returns fetch_failed when the upstream fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network error");
      })
    );

    const response = await POST(makeRequest({ url: "http://localhost:1" }));
    expect(response.status).toBe(200);

    const data = (await response.json()) as ConvertResponse;
    if (!("kind" in data)) {
      throw new Error("expected error response");
    }
    expect(data.kind).toBe("fetch_failed");
    expect(data.message.length).toBeGreaterThan(0);
  });

  it("returns fetch_failed when the upstream responds with a non-2xx status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 }))
    );

    const response = await POST(makeRequest({ url: "https://example.com/missing" }));
    const data = (await response.json()) as ConvertResponse;
    if (!("kind" in data)) {
      throw new Error("expected error response");
    }
    expect(data.kind).toBe("fetch_failed");
    expect(data.message).toMatch(/404/);
  });

  it.each([
    "http://localhost/anything",
    "http://127.0.0.1/x",
    "http://10.0.0.5/x",
    "http://192.168.1.10/x",
    "http://169.254.169.254/latest/meta-data/",
    "http://172.16.0.1/x",
    "http://example.local/x",
  ])("blocks internal/loopback targets without issuing an upstream fetch: %s", async (url) => {
    const fetchSpy = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(makeRequest({ url }));
    const data = (await response.json()) as ConvertResponse;
    expect("kind" in data && data.kind).toBe("fetch_failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects responses whose content-length exceeds the cap without buffering the body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("ignored", {
            status: 200,
            headers: { "content-length": String(10 * 1024 * 1024) },
          })
      )
    );

    const response = await POST(makeRequest({ url: "https://example.com/huge" }));
    const data = (await response.json()) as ConvertResponse;
    expect("kind" in data && data.kind).toBe("fetch_failed");
  });

  it("returns extract_failed when the page has no extractable body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("<html><head><title></title></head><body></body></html>", {
            status: 200,
          })
      )
    );

    const response = await POST(makeRequest({ url: "https://example.com/empty" }));
    const data = (await response.json()) as ConvertResponse;
    if (!("kind" in data)) {
      throw new Error("expected error response");
    }
    expect(data.kind).toBe("extract_failed");
  });
});
