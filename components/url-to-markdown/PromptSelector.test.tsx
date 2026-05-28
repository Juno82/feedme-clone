import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptSelector } from "./PromptSelector";
import { INITIAL_PROMPT_STATE, type PromptState } from "@/types/prompt";

function Wrapper({
  onState,
  initial = INITIAL_PROMPT_STATE,
}: {
  onState?: (s: PromptState) => void;
  initial?: PromptState;
}) {
  const [state, setState] = useState<PromptState>(initial);
  return (
    <PromptSelector
      value={state}
      onChange={(next) => {
        setState(next);
        onState?.(next);
      }}
    />
  );
}

function getOption(name: string): HTMLElement {
  return screen.getByRole("radio", { name });
}

describe("PromptSelector", () => {
  it("renders initially with no preset selected and no textarea", () => {
    render(<Wrapper />);
    expect(getOption("요약해줘")).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("activates exactly one preset at a time", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(getOption("요약해줘"));
    expect(getOption("요약해줘")).toHaveAttribute("aria-checked", "true");

    await user.click(getOption("한국어로 번역해줘"));
    expect(getOption("요약해줘")).toHaveAttribute("aria-checked", "false");
    expect(getOption("한국어로 번역해줘")).toHaveAttribute("aria-checked", "true");
  });

  it("deselects when the active preset is clicked again", async () => {
    const user = userEvent.setup();
    const onState = vi.fn();
    render(<Wrapper onState={onState} />);

    await user.click(getOption("쉽게 설명해줘"));
    await user.click(getOption("쉽게 설명해줘"));

    expect(getOption("쉽게 설명해줘")).toHaveAttribute("aria-checked", "false");
    expect(onState).toHaveBeenLastCalledWith({ choice: null, customText: "" });
  });

  it("reveals the textarea when 직접 입력 is selected and hides it on other selections", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(getOption("직접 입력"));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, "핵심 3개로 정리해줘");
    expect(textarea.value).toBe("핵심 3개로 정리해줘");

    await user.click(getOption("요약해줘"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
