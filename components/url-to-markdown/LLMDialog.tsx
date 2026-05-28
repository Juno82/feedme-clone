"use client";

import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildLLMUrl, hostBaseUrl, hostLabel, type LLMHost } from "@/lib/llmTransfer";

interface Props {
  host: LLMHost;
  transferText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LLMDialog({ host, transferText, open, onOpenChange }: Props) {
  const label = hostLabel(host);

  async function handleCopyAndOpen() {
    // window.open must run synchronously within the user-gesture event before
    // any awaits — popup blockers reject opens that happen after a microtask.
    const window_ = window.open(hostBaseUrl(host), "_blank");
    try {
      await navigator.clipboard.writeText(transferText);
      toast.success(`${label} 새 탭이 열렸고 텍스트가 클립보드에 복사되었습니다`);
    } catch {
      toast.error("클립보드 복사에 실패했습니다");
    }
    if (!window_) {
      toast.warning("팝업이 차단되어 새 탭을 열 수 없습니다");
    }
    onOpenChange(false);
  }

  function handleUrlOpen() {
    const url = buildLLMUrl(host, transferText);
    const window_ = window.open(url, "_blank");
    if (!window_) {
      toast.warning("팝업이 차단되어 새 탭을 열 수 없습니다");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}로 열기</DialogTitle>
          <DialogDescription>
            전달 방식을 선택하세요. 긴 본문에는 클립보드 방식을 권장합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={handleCopyAndOpen}>
            <HugeiconsIcon icon={Copy01Icon} data-icon="inline-start" />
            클립보드 복사 후 열기
          </Button>
          <Button type="button" variant="outline" onClick={handleUrlOpen}>
            <HugeiconsIcon icon={ArrowUpRight01Icon} data-icon="inline-start" />
            URL 파라미터로 전달
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium text-muted-foreground">
            전달 텍스트 미리보기
          </div>
          <pre
            data-testid="llm-transfer-preview"
            className="max-h-32 overflow-hidden rounded-md bg-muted px-3 py-2 text-xs whitespace-pre-wrap break-words text-muted-foreground"
          >
            {transferText}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
