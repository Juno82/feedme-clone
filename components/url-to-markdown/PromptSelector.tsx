"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  PROMPT_PRESETS,
  type PromptChoice,
  type PromptState,
} from "@/types/prompt";

interface Props {
  value: PromptState;
  onChange: (next: PromptState) => void;
}

export function PromptSelector({ value, onChange }: Props) {
  function handleChoiceChange(next: string) {
    const choice = (next === "" ? null : (next as Exclude<PromptChoice, null>));
    onChange({
      choice,
      customText: choice === "custom" ? value.customText : "",
    });
  }

  return (
    <Field>
      <FieldLabel htmlFor="prompt-group">프롬프트</FieldLabel>
      <ToggleGroup
        id="prompt-group"
        type="single"
        variant="outline"
        value={value.choice ?? ""}
        onValueChange={handleChoiceChange}
        aria-label="LLM 전달 프롬프트"
        className="flex-wrap"
      >
        {PROMPT_PRESETS.map((preset) => (
          <ToggleGroupItem key={preset.id} value={preset.id}>
            {preset.label}
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value="custom">직접 입력</ToggleGroupItem>
      </ToggleGroup>

      {value.choice === "custom" && (
        <Textarea
          aria-label="프롬프트 직접 입력"
          placeholder="이 글의 핵심 주장을 3개로 정리해줘"
          value={value.customText}
          onChange={(event) =>
            onChange({ choice: "custom", customText: event.target.value })
          }
          rows={3}
        />
      )}

      <FieldDescription>
        미선택 시: LLM 액션은 Markdown 본문만 전달합니다.
      </FieldDescription>
    </Field>
  );
}
