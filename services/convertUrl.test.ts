import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convertUrl } from "./convertUrl";

describe("convertUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the API success payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              url: "https://example.com",
              title: "T",
              author: "A",
              markdown: "# T",
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )
      )
    );

    const response = await convertUrl("https://example.com");
    if ("kind" in response) throw new Error("expected success");
    expect(response.title).toBe("T");
  });

  it("returns fetch_failed when fetch throws (offline / DNS error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      })
    );

    const response = await convertUrl("https://example.com");
    expect("kind" in response && response.kind).toBe("fetch_failed");
  });

  it("returns fetch_failed when the API returns non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 }))
    );

    const response = await convertUrl("https://example.com");
    expect("kind" in response && response.kind).toBe("fetch_failed");
  });
});
