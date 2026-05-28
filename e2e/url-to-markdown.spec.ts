import { expect, test } from "@playwright/test";

const SUCCESS_BODY = {
  url: "https://example.com/article",
  title: "How React Works",
  author: "Jane Doe",
  markdown:
    "# How React Works\n\nReact renders user interfaces through a virtual DOM.\n\n- Diffs the tree\n- Applies minimal mutations",
};

test.describe("URL → Markdown 변환기", () => {
  test("convert → render → copy → ChatGPT URL → dark mode persistence", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.route("**/api/convert", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SUCCESS_BODY),
      });
    });

    await page.goto("/");

    const urlInput = page.getByPlaceholder("https://example.com/article");
    await urlInput.fill("https://example.com/article");
    await page.getByRole("button", { name: "변환", exact: true }).click();

    const headerTitle = page.getByRole("heading", {
      level: 2,
      name: "How React Works",
    });
    await expect(headerTitle).toBeVisible();
    await expect(page.getByText("by Jane Doe")).toBeVisible();
    await expect(page.getByText("React renders user interfaces")).toBeVisible();

    await page.getByRole("button", { name: "복사" }).click();
    const clipboardValue = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardValue.replace(/\r\n/g, "\n")).toBe(SUCCESS_BODY.markdown);

    await page.getByRole("button", { name: /ChatGPT로 열기/ }).click();
    await expect(page.getByRole("heading", { name: "ChatGPT로 열기" })).toBeVisible();

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /URL 파라미터로 전달/ }).click(),
    ]);
    const popupUrl = popup.url();
    expect(popupUrl).toContain("chatgpt.com");
    expect(popupUrl).toContain("q=");
    await popup.close();

    const themeButton = page.getByRole("button", { name: /다크 모드로 전환/ });
    await themeButton.click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
