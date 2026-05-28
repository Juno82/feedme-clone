import { describe, it, expect } from "vitest";
import { isValidHttpUrl } from "./urlValidation";

describe("isValidHttpUrl", () => {
  it("rejects empty string", () => {
    expect(isValidHttpUrl("")).toBe(false);
    expect(isValidHttpUrl("   ")).toBe(false);
  });

  it("rejects free text without a scheme", () => {
    expect(isValidHttpUrl("not a url")).toBe(false);
    expect(isValidHttpUrl("example.com")).toBe(false);
  });

  it("rejects non-http(s) schemes", () => {
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });

  it("accepts http:// and https:// URLs", () => {
    expect(isValidHttpUrl("https://example.com")).toBe(true);
    expect(isValidHttpUrl("http://example.com/path?q=1")).toBe(true);
    expect(isValidHttpUrl("https://example.com/blog/post")).toBe(true);
  });

  it("trims leading/trailing whitespace before validation", () => {
    expect(isValidHttpUrl("  https://example.com  ")).toBe(true);
  });
});
