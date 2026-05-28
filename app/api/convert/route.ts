import { NextResponse } from "next/server";
import { extractFromHtml } from "@/lib/extract";
import type { ConvertResponse } from "@/types/conversion";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;

interface ConvertRequestBody {
  url?: unknown;
}

function fetchFailed(message = "페이지를 가져올 수 없습니다."): NextResponse<ConvertResponse> {
  return NextResponse.json({ kind: "fetch_failed", message }, { status: 200 });
}

function extractFailed(): NextResponse<ConvertResponse> {
  return NextResponse.json(
    { kind: "extract_failed", message: "본문을 찾지 못했습니다." },
    { status: 200 }
  );
}

// Block obvious internal/loopback targets by hostname string to limit SSRF
// surface. We deliberately do not resolve DNS — this is best-effort and
// doesn't defend against DNS rebinding; pair with `redirect: "manual"` so
// a public URL can't redirect into the internal network. Sufficient for a
// single-user personal tool; revisit if this app ever runs multi-tenant.
function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }
  if (host === "0.0.0.0" || host === "::" || host === "::1" || host === "[::1]") {
    return true;
  }
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return true;
  }
  return false;
}

export async function POST(request: Request): Promise<NextResponse<ConvertResponse>> {
  let body: ConvertRequestBody;
  try {
    body = (await request.json()) as ConvertRequestBody;
  } catch {
    return fetchFailed("요청 본문을 읽지 못했습니다.");
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return fetchFailed("URL이 비어 있습니다.");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fetchFailed();
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fetchFailed();
  if (isInternalHostname(parsed.hostname)) return fetchFailed();

  let html: string;
  try {
    const upstream = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FeedmeClone/0.1; +https://example.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!upstream.ok) {
      return fetchFailed(`페이지를 가져올 수 없습니다 (HTTP ${upstream.status}).`);
    }
    const contentLength = Number(upstream.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BODY_BYTES) return fetchFailed();
    html = await upstream.text();
    if (html.length > MAX_BODY_BYTES) return fetchFailed();
  } catch {
    return fetchFailed();
  }

  try {
    const extracted = await extractFromHtml(html, url);
    if (!extracted.markdown) return extractFailed();
    return NextResponse.json(extracted, { status: 200 });
  } catch {
    return extractFailed();
  }
}
