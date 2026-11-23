import { test, expect } from "@playwright/test";
import { choose } from "./persona";

test.beforeEach(async ({ page }) => {
  await page.route("https://posthog.test/**", (route) => route.fulfill({ json: {} }));
});

for (const width of [1280, 390]) {
  test(`hosted AI is public and preserves a rate-limited question at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let limited = true;
    const questions: string[] = [];
    await page.route("**/api/i02/**", (route) =>
      route.fulfill({ status: 503, json: { error: "not_configured" } }),
    );
    await page.route("**/api/i02/chat", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { available: true } });
      } else {
        questions.push(route.request().postDataJSON().question);
        if (limited) await route.fulfill({ status: 429, body: "Rate limit exceeded" });
        else
          await route.fulfill({
            json: {
              claims: [{ text: "Opisuje przygotowanie instrukcji.", sourceIds: ["answer-first"] }],
              unknown: "Nie opisano sposobu pomiaru.",
            },
          });
      }
    });
    await choose(page, "Karolina Wiśniewska");
    await page.goto("/#/app/kandydaci/application-i02");
    const open = page.getByRole("button", { name: "Zapytaj AI", exact: true });
    await open.click();
    const question = page.getByRole("textbox", { name: "Pytanie do AI", exact: true });
    await expect(question).toBeVisible();
    await question.fill("Co zrobił kandydat?");
    await page.getByRole("button", { name: "Wyślij pytanie", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Osiągnięto limit zapytań AI");
    await expect(question).toHaveValue("Co zrobił kandydat?");
    limited = false;
    await page.getByRole("button", { name: "Wyślij pytanie", exact: true }).click();
    await expect(page.getByRole("log")).toContainText("Opisuje przygotowanie instrukcji.");
    expect(questions).toEqual(["Co zrobił kandydat?", "Co zrobił kandydat?"]);
    await expect(question).toHaveValue("");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/i02-hosted-${width}.png`, fullPage: true });
  });
}
