import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setTheme = vi.fn();
let mockResolvedTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    setTheme,
  }),
}));

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockReset();
    mockResolvedTheme = "light";
  });

  it("toggles from light to dark when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /다크 모드로 전환/ })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /다크 모드로 전환/ }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles from dark to light when already dark", async () => {
    mockResolvedTheme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /라이트 모드로 전환/ })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /라이트 모드로 전환/ }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
