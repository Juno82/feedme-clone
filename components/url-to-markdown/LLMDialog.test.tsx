import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LLMDialog } from "./LLMDialog";

const noop = () => {};

describe("LLMDialog", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    openSpy = vi.spyOn(window, "open").mockReturnValue({ closed: false } as Window);
    writeText = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupUser() {
    const user = userEvent.setup();
    vi.spyOn(window.navigator.clipboard, "writeText").mockImplementation(writeText);
    return user;
  }

  it("shows the two transfer options and a preview of the transfer text", () => {
    render(
      <LLMDialog
        host="chatgpt"
        transferText={"요약해줘\n\n# Title\n\nBody."}
        open
        onOpenChange={noop}
      />
    );

    expect(screen.getByRole("heading", { name: "ChatGPT로 열기" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /클립보드 복사 후 열기/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /URL 파라미터로 전달/ })
    ).toBeInTheDocument();
    expect(screen.getByTestId("llm-transfer-preview")).toHaveTextContent(
      "요약해줘"
    );
  });

  it("copies transfer text and opens chatgpt.com when 클립보드 복사 후 열기 is chosen", async () => {
    const user = setupUser();
    render(
      <LLMDialog
        host="chatgpt"
        transferText="hello"
        open
        onOpenChange={noop}
      />
    );

    await user.click(screen.getByRole("button", { name: /클립보드 복사 후 열기/ }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toMatch(/chatgpt\.com/);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("opens the query-string URL when URL 파라미터로 전달 is chosen (chatgpt host)", async () => {
    const user = setupUser();
    render(
      <LLMDialog
        host="chatgpt"
        transferText={"요약해줘\n\n# Title"}
        open
        onOpenChange={noop}
      />
    );

    await user.click(screen.getByRole("button", { name: /URL 파라미터로 전달/ }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const openedUrl = openSpy.mock.calls[0][0] as string;
    const parsed = new URL(openedUrl);
    expect(parsed.hostname).toBe("chatgpt.com");
    expect(parsed.searchParams.get("q")).toBe("요약해줘\n\n# Title");
  });

  it("targets claude.ai/new when host is claude", async () => {
    const user = setupUser();
    render(
      <LLMDialog
        host="claude"
        transferText="hi"
        open
        onOpenChange={noop}
      />
    );

    await user.click(screen.getByRole("button", { name: /URL 파라미터로 전달/ }));
    const openedUrl = openSpy.mock.calls[0][0] as string;
    const parsed = new URL(openedUrl);
    expect(parsed.hostname).toBe("claude.ai");
    expect(parsed.pathname).toBe("/new");
    expect(parsed.searchParams.get("q")).toBe("hi");

    await user.click(screen.getByRole("button", { name: /클립보드 복사 후 열기/ }));
    expect(openSpy.mock.calls[1][0]).toMatch(/claude\.ai\/new/);
  });
});
