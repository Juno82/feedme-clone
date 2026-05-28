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
