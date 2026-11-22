import { expect, type Page } from "@playwright/test";

export async function choose(page: Page, name: string) {
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: `Wejdź jako ${name}`, exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth\/sign-in/);
}
export async function application(
  page: Page,
  answer = "Zaprojektowałam proces automatyzacji i przeprowadziłam badania użytkowników. Wynik: krótszy czas obsługi zgłoszeń o 30%.",
) {
  await choose(page, "Anna Kowalska");
  await page.goto("/#/aplikuj/ai-product-manager");
  await page.getByLabel("Dlaczego pasujesz do tej roli?").fill(answer);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/aplikacje\?wyslano=1/);
}
