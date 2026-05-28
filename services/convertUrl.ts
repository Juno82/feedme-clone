import type { ConvertResponse } from "@/types/conversion";

export async function convertUrl(url: string): Promise<ConvertResponse> {
  const response = await fetch("/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    return {
      kind: "fetch_failed",
      message: `요청이 실패했습니다 (HTTP ${response.status}).`,
    };
  }

  return (await response.json()) as ConvertResponse;
}
