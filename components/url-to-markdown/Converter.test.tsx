import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Converter } from "./Converter";
import type { ConvertResponse } from "@/types/conversion";

vi.mock("@/services/convertUrl", () => ({
  convertUrl: vi.fn(),
}));

import { convertUrl } from "@/services/convertUrl";

const mockedConvertUrl = vi.mocked(convertUrl);

function makeSuccess(overrides: Partial<ConvertResponse> = {}) {
  return {
    url: "https://example.com/article",
    title: "How React Works",
    author: "Jane Doe",
    markdown: "# How React Works\n\nReact renders user interfaces.\n",
    ...overrides,
  } as ConvertResponse;
}

describe("Converter", () => {
  beforeEach(() => {
    mockedConvertUrl.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders header (title) and markdown body after a successful conversion", async () => {
    mockedConvertUrl.mockResolvedValue(makeSuccess());
    const user = userEvent.setup();

    render(<Converter />);

    await user.type(
      screen.getByPlaceholderText(/https:\/\/example\.com/),
      "https://example.com/article"
    );
    await user.click(screen.getByRole("button", { name: "변환" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "How React Works" })
      ).toBeInTheDocument();
    });
    expect(screen.getByText("by Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/React renders user interfaces/)).toBeInTheDocument();
  });

  it("disables the convert button and shows a progress indicator while converting", async () => {
    let resolveFn: (value: ConvertResponse) => void = () => {};
    mockedConvertUrl.mockImplementation(
      () =>
        new Promise<ConvertResponse>((resolve) => {
          resolveFn = resolve;
        })
    );
    const user = userEvent.setup();

    render(<Converter />);

    await user.type(
      screen.getByPlaceholderText(/https:\/\/example\.com/),
      "https://example.com/article"
    );
    await user.click(screen.getByRole("button", { name: "변환" }));

    const convertButton = screen.getByRole("button", { name: /변환/ });
    expect(convertButton).toBeDisabled();
    expect(screen.getByText(/변환 중/)).toBeInTheDocument();

    resolveFn(makeSuccess());
    await waitFor(() => {
      expect(screen.queryByText(/변환 중/)).not.toBeInTheDocument();
    });
  });

  it("disables the convert button when the input is empty (no error message)", () => {
    render(<Converter />);
    expect(screen.getByRole("button", { name: "변환" })).toBeDisabled();
    expect(screen.queryByText(/올바른 URL/)).not.toBeInTheDocument();
  });

  it("shows an inline format error and keeps the button disabled for invalid input", async () => {
    const user = userEvent.setup();
    render(<Converter />);

    await user.type(screen.getByPlaceholderText(/https:\/\/example\.com/), "not a url");

    expect(screen.getByRole("button", { name: "변환" })).toBeDisabled();
    expect(screen.getByText(/올바른 URL/)).toBeInTheDocument();
  });

  it("clears the format error and enables the button when a valid URL is entered", async () => {
    const user = userEvent.setup();
    render(<Converter />);

    const input = screen.getByPlaceholderText(/https:\/\/example\.com/);
    await user.type(input, "bogus");
    expect(screen.getByText(/올바른 URL/)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "https://example.com/post");

    expect(screen.queryByText(/올바른 URL/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변환" })).toBeEnabled();
  });

  it("shows the inline error and preserves the URL when conversion fails", async () => {
    mockedConvertUrl.mockResolvedValue({
      kind: "fetch_failed",
      message: "페이지를 가져올 수 없습니다.",
    });
    const user = userEvent.setup();
    render(<Converter />);

    const input = screen.getByPlaceholderText(/https:\/\/example\.com/) as HTMLInputElement;
    await user.type(input, "https://example.com/article");
    await user.click(screen.getByRole("button", { name: "변환" }));

    await waitFor(() => {
      expect(screen.getByText("페이지를 가져올 수 없습니다.")).toBeInTheDocument();
    });
    expect(input.value).toBe("https://example.com/article");
    expect(
      screen.queryByRole("heading", { level: 2, name: "How React Works" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변환" })).toBeEnabled();
  });

  it("shows extract_failed messages inline and leaves the result area empty", async () => {
    mockedConvertUrl.mockResolvedValue({
      kind: "extract_failed",
      message: "본문을 찾지 못했습니다.",
    });
    const user = userEvent.setup();
    render(<Converter />);

    await user.type(
      screen.getByPlaceholderText(/https:\/\/example\.com/),
      "https://example.com/empty"
    );
    await user.click(screen.getByRole("button", { name: "변환" }));

    await waitFor(() => {
      expect(screen.getByText("본문을 찾지 못했습니다.")).toBeInTheDocument();
    });
  });

  it("falls back to the source URL when the page has no title", async () => {
    mockedConvertUrl.mockResolvedValue(
      makeSuccess({ title: undefined, author: "Anonymous" })
    );
    const user = userEvent.setup();
    render(<Converter />);

    await user.type(
      screen.getByPlaceholderText(/https:\/\/example\.com/),
      "https://example.com/article"
    );
    await user.click(screen.getByRole("button", { name: "변환" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "https://example.com/article" })
      ).toBeInTheDocument();
    });
    expect(screen.getByText("by Anonymous")).toBeInTheDocument();
  });

  it("omits the author line when author is missing", async () => {
    mockedConvertUrl.mockResolvedValue(makeSuccess({ author: undefined }));
    const user = userEvent.setup();
    render(<Converter />);

    await user.type(
      screen.getByPlaceholderText(/https:\/\/example\.com/),
      "https://example.com/article"
    );
    await user.click(screen.getByRole("button", { name: "변환" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "How React Works" })
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
  });

  it("renders the four action buttons after a successful conversion", async () => {
    mockedConvertUrl.mockResolvedValue(makeSuccess());
    const user = userEvent.setup();

    render(<Converter />);

    await user.type(
      screen.getByPlaceholderText(/https:\/\/example\.com/),
      "https://example.com/article"
    );
    await user.click(screen.getByRole("button", { name: "변환" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "복사" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /\.md 다운로드/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ChatGPT로 열기/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Claude로 열기/ })).toBeInTheDocument();
  });
});
