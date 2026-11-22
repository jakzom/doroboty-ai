import { expect, test } from "@playwright/test";
import { application, choose } from "./persona";

test("a downloaded scenario restores the submitted answer and invitation in a fresh session", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const answer =
    "W fikcyjnym projekcie Anny sprawdziłam formularz z trzema osobami i uprościłam zgłoszenie.";
  await application(page, answer);
  await choose(page, "Karolina Wiśniewska");
  await page.goto("/#/app/kandydaci");
  await page.getByRole("link", { name: "Anna Kowalska", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Odpowiedź" })).toContainText(answer);
  await page.getByRole("button", { name: "W przeglądzie", exact: true }).click();
  await page.getByRole("button", { name: "Zaproszenie na rozmowę", exact: true }).click();
  await expect(page.locator(".record-stage")).toHaveText("Zaproszenie na rozmowę");
  await page.goto("/#/app/settings");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksportuj dane" }).click();
  const backup = testInfo.outputPath("scenario.json");
  await (await downloading).saveAs(backup);

  const restored = await browser.newPage({ baseURL });
  try {
    await choose(restored, "Anna Kowalska");
    await restored.goto("/#/app/aplikacje");
    await expect(
      restored.getByRole("heading", { name: "Moje aplikacje", exact: true }),
    ).toBeVisible();
    const offer = restored.getByRole("link", { name: "AI Product Manager", exact: true });
    await expect(offer).toHaveCount(0);
    await restored.goto("/#/app/settings");
    await restored.getByLabel("Importuj plik scenariusza").setInputFiles(backup);
    await restored.getByRole("button", { name: "Importuj", exact: true }).click();
    await expect(
      restored.getByRole("link", { name: "Karolina Wiśniewska", exact: true }),
    ).toBeVisible();
    await choose(restored, "Anna Kowalska");
    await restored.goto("/#/app/aplikacje");
    await offer.click();
    await restored.reload();
    await expect(restored.getByRole("tabpanel", { name: "Odpowiedź" })).toContainText(answer);
    await expect(restored.locator(".record-stage")).toHaveText("Zaproszenie na rozmowę");
  } finally {
    await restored.close();
  }
});

test("removing a saved offer affects only the candidate who removed it", async ({ page }) => {
  const offer = page.getByRole("link", { name: "AI Product Manager", exact: true });
  const save = page.getByRole("button", { name: "Zapisz ofertę", exact: true });
  for (const name of ["Anna Kowalska", "Marek Nowak"]) {
    await choose(page, name);
    await page.goto("/#/oferty/ai-product-manager");
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");
  }
  await page.goto("/#/app/zapisane");
  await page
    .getByRole("button", { name: "Zapisz ofertę: AI Product Manager", exact: true })
    .click();
  const empty = page.getByText("Nie masz jeszcze zapisanych ofert.", { exact: true });
  await expect(empty).toBeVisible();
  await page.reload();
  await expect(empty).toBeVisible();
  await choose(page, "Anna Kowalska");
  await page.goto("/#/app/zapisane");
  await expect(offer).toBeVisible();
  await offer.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
});

test("two candidates resume independent drafts for the same offer", async ({ page }) => {
  const drafts = [
    { name: "Anna Kowalska", text: "Szkic Anny o badaniach formularza w fikcyjnym projekcie." },
    { name: "Marek Nowak", text: "Szkic Marka o testach procesu w przykładowej firmie." },
  ];
  const answer = page.getByLabel("Dlaczego pasujesz do tej roli?");
  for (const draft of drafts) {
    await choose(page, draft.name);
    await page.goto("/#/aplikuj/ai-operations-specialist");
    await expect(answer).toHaveValue("");
    await answer.fill(draft.text);
    await page.getByRole("button", { name: "Zapisz szkic" }).click();
    await expect(page.getByRole("status")).toHaveText("Szkic został zapisany.");
  }
  for (const draft of drafts) {
    await choose(page, draft.name);
    await page.goto("/#/aplikuj/ai-operations-specialist");
    await page.reload();
    await expect(answer).toHaveValue(draft.text);
  }
});
