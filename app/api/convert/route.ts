import { NextResponse } from "next/server";
import { extractFromHtml } from "@/lib/extract";
import type { ConvertResponse } from "@/types/conversion";

export const runtime = "nodejs";

interface ConvertRequestBody {
  url?: unknown;
}

export async function POST(request: Request): Promise<NextResponse<ConvertResponse>> {
  let body: ConvertRequestBody;
  try {
    body = (await request.json()) as ConvertRequestBody;
  } catch {
    return NextResponse.json(
      { kind: "fetch_failed", message: "요청 본문을 읽지 못했습니다." },
      { status: 200 }
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json(
      { kind: "fetch_failed", message: "URL이 비어 있습니다." },
      { status: 200 }
    );
  }

  let html: string;
  try {
    const upstream = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FeedmeClone/0.1; +https://example.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        {
          kind: "fetch_failed",
          message: `페이지를 가져올 수 없습니다 (HTTP ${upstream.status}).`,
        },
        { status: 200 }
      );
    }
    html = await upstream.text();
  } catch {
    return NextResponse.json(
      { kind: "fetch_failed", message: "페이지를 가져올 수 없습니다." },
      { status: 200 }
    );
  }

  try {
    const extracted = await extractFromHtml(html, url);
    if (!extracted.markdown) {
      return NextResponse.json(
        { kind: "extract_failed", message: "본문을 찾지 못했습니다." },
        { status: 200 }
      );
    }
    return NextResponse.json(extracted, { status: 200 });
  } catch {
    return NextResponse.json(
      { kind: "extract_failed", message: "본문을 찾지 못했습니다." },
      { status: 200 }
    );
  }
}
