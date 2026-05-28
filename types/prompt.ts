export type PromptChoice =
  | "summarize"
  | "translate_ko"
  | "explain_simple"
  | "custom"
  | null;

export interface PromptState {
  choice: PromptChoice;
  customText: string;
}

export const INITIAL_PROMPT_STATE: PromptState = {
  choice: null,
  customText: "",
};

export interface PromptPreset {
  id: Exclude<PromptChoice, "custom" | null>;
  label: string;
  text: string;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  { id: "summarize", label: "요약해줘", text: "요약해줘" },
  { id: "translate_ko", label: "한국어로 번역해줘", text: "한국어로 번역해줘" },
  { id: "explain_simple", label: "쉽게 설명해줘", text: "쉽게 설명해줘" },
];

export function resolvePromptText(state: PromptState): string {
  if (state.choice === "custom") {
    return state.customText.trim();
  }
  const preset = PROMPT_PRESETS.find((p) => p.id === state.choice);
  return preset?.text ?? "";
}
