import type { ConvertResponse } from "@/types/conversion";

export async function convertUrl(url: string): Promise<ConvertResponse> {
  try {
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
  } catch {
    return {
      kind: "fetch_failed",
      message: "네트워크 오류가 발생했습니다.",
    };
  }
}
