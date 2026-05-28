import { describe, it, expect } from "vitest";
import { buildTransferText, buildLLMUrl, type LLMHost } from "./llmTransfer";
import type { PromptState } from "@/types/prompt";

const baseMarkdown = "# Title\n\nBody.";

function s(choice: PromptState["choice"], customText = ""): PromptState {
  return { choice, customText };
}

describe("buildTransferText", () => {
  it("returns markdown only when no prompt is selected", () => {
    expect(buildTransferText(s(null), baseMarkdown)).toBe(baseMarkdown);
  });

  it("prepends a preset prompt + blank line + markdown", () => {
    expect(buildTransferText(s("summarize"), baseMarkdown)).toBe(
      `요약해줘\n\n${baseMarkdown}`
    );
    expect(buildTransferText(s("translate_ko"), baseMarkdown)).toBe(
      `한국어로 번역해줘\n\n${baseMarkdown}`
    );
  });

  it("prepends custom prompt text when 직접 입력 is selected", () => {
    expect(
      buildTransferText(s("custom", "이 글의 핵심을 3개로 정리해줘"), baseMarkdown)
    ).toBe(`이 글의 핵심을 3개로 정리해줘\n\n${baseMarkdown}`);
  });

  it("treats an empty custom prompt the same as no selection", () => {
    expect(buildTransferText(s("custom", "   "), baseMarkdown)).toBe(baseMarkdown);
    expect(buildTransferText(s("custom", ""), baseMarkdown)).toBe(baseMarkdown);
  });
});

describe("buildLLMUrl", () => {
  it.each<[LLMHost, RegExp]>([
    ["chatgpt", /^https:\/\/chatgpt\.com\/\?q=/],
    ["claude", /^https:\/\/claude\.ai\/new\?q=/],
  ])("targets the right host for %s", (host, pattern) => {
    const url = buildLLMUrl(host, "hello world");
    expect(url).toMatch(pattern);
  });

  it("URL-encodes the query string", () => {
    const url = buildLLMUrl("chatgpt", "요약해줘\n\n# Title");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("q")).toBe("요약해줘\n\n# Title");
  });
});
