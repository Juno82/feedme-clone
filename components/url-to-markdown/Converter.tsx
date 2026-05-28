"use client";

import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  Download01Icon,
  ArrowUpRight01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { convertUrl } from "@/services/convertUrl";
import { isValidHttpUrl } from "@/lib/urlValidation";
import { deriveFilename } from "@/lib/filename";
import {
  isConvertError,
  type ConvertError,
  type ConvertSuccess,
} from "@/types/conversion";

export function Converter() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ConvertSuccess | null>(null);
  const [error, setError] = useState<ConvertError | null>(null);
  const [isPending, setIsPending] = useState(false);

  const trimmedUrl = url.trim();
  const isEmpty = trimmedUrl.length === 0;
  const isValidFormat = isEmpty ? true : isValidHttpUrl(trimmedUrl);
  const showFormatError = !isEmpty && !isValidFormat;
  const inlineErrorMessage = showFormatError
    ? "올바른 URL을 입력하세요 (http:// 또는 https://)."
    : error?.message ?? null;
  const showInlineError = inlineErrorMessage !== null;

  async function handleConvert() {
    if (!isValidFormat || isEmpty) return;
    setError(null);
    setResult(null);
    setIsPending(true);
    try {
      const response = await convertUrl(trimmedUrl);
      if (isConvertError(response)) {
        setError(response);
        setResult(null);
      } else {
        setResult(response);
        setError(null);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold">URL → Markdown 변환기</h1>
          <p className="text-sm text-muted-foreground">
            웹 페이지를 본문 Markdown으로 변환합니다
          </p>
        </div>
        <Button variant="outline" size="icon" aria-label="다크모드 토글" disabled>
          <HugeiconsIcon icon={Loading03Icon} />
        </Button>
      </header>

      <Card>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={showInlineError || undefined}>
              <FieldLabel htmlFor="url-input">URL</FieldLabel>
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={showInlineError || undefined}
                  aria-describedby={showInlineError ? "url-error" : undefined}
                  className="md:flex-1"
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleConvert}
                    disabled={isEmpty || !isValidFormat || isPending}
                    aria-busy={isPending}
                  >
                    {isPending ? (
                      <>
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                        변환 중…
                      </>
                    ) : (
                      "변환"
                    )}
                  </Button>
                  <Button type="button" variant="outline">
                    지우기
                  </Button>
                </div>
              </div>
              {showInlineError && (
                <FieldDescription id="url-error">{inlineErrorMessage}</FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {result && <ResultPanel result={result} />}

      {!result && !error && !isPending && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            변환 결과가 여기에 표시됩니다
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: ConvertSuccess }) {
  const headerTitle = result.title?.trim() || result.url;

  async function handleCopy() {
    await navigator.clipboard.writeText(result.markdown);
    toast.success("Markdown이 복사되었습니다");
  }

  function handleDownload() {
    const filename = deriveFilename(result.title, result.url);
    const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold break-words">
            {headerTitle}
          </h2>
          {result.author && (
            <p className="text-sm text-muted-foreground">by {result.author}</p>
          )}
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            <HugeiconsIcon icon={Copy01Icon} data-icon="inline-start" />
            복사
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
            <HugeiconsIcon icon={Download01Icon} data-icon="inline-start" />
            .md 다운로드
          </Button>
          <Button type="button" variant="outline" size="sm">
            <HugeiconsIcon icon={ArrowUpRight01Icon} data-icon="inline-start" />
            ChatGPT로 열기
          </Button>
          <Button type="button" variant="outline" size="sm">
            <HugeiconsIcon icon={ArrowUpRight01Icon} data-icon="inline-start" />
            Claude로 열기
          </Button>
        </div>

        <Separator />

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.markdown}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
