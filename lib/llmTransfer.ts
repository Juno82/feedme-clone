import { resolvePromptText, type PromptState } from "@/types/prompt";

export type LLMHost = "chatgpt" | "claude";

const HOST_URLS: Record<LLMHost, string> = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
};

export function buildTransferText(state: PromptState, markdown: string): string {
  const prompt = resolvePromptText(state);
  return prompt ? `${prompt}\n\n${markdown}` : markdown;
}

export function buildLLMUrl(host: LLMHost, text: string): string {
  const url = new URL(HOST_URLS[host]);
  url.searchParams.set("q", text);
  return url.toString();
}

export function hostLabel(host: LLMHost): string {
  return host === "chatgpt" ? "ChatGPT" : "Claude";
}
