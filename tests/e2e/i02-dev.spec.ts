import { storedScenario, seedRaw } from "./persistence";
import { test, expect, type Page } from "@playwright/test";
import { initialState } from "../../src/features/prototype/model";

async function choose(page: Page, name: string) {
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: `Wejdź jako ${name}`, exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth\/sign-in/);
}
async function application(page: Page) {
  await choose(page, "Anna Kowalska");
  await page.goto("/#/aplikuj/ai-product-manager");
  await page
    .getByLabel("Dlaczego pasujesz do tej roli?")
    .fill(
      "Zaprojektowałam proces automatyzacji i przeprowadziłam badania użytkowników. Wynik: krótszy czas obsługi zgłoszeń o 30%.",
    );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/aplikacje\?wyslano=1/);
}

const i02Route = "/#/app/kandydaci/application-i02";

// A missing route mock must never reach a configured provider.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/i02/**", (route) =>
    route.fulfill({ status: 503, json: { error: "not_configured" } }),
  );
});

test("I02 chat is optional and keeps sourced conversation context through a retry", async ({
  page,
}) => {
  const path = "**/api/i02/chat";
  await page.route(path, (route) => route.fulfill({ json: { available: false } }));
  await choose(page, "Karolina Wiśniewska");
  await page.goto(i02Route);
  const chat = page.getByRole("button", { name: "Zapytaj AI", exact: true });
  await chat.click();
  await expect(page.getByText("Czat AI jest niedostępny", { exact: false })).toBeVisible();
  await page.unroute(path);
  const requests: unknown[] = [];
  const reply = {
    claims: [{ text: "Kandydat opisuje przygotowanie instrukcji.", sourceIds: ["answer-first"] }],
    unknown: "Nie podano efektu samodzielnej pracy.",
  };
  await page.route(path, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { available: true } });
      return;
    }
    requests.push(route.request().postDataJSON());
    if (requests.length === 2) await route.fulfill({ status: 502 });
    else
      await route.fulfill({
        json: requests.length === 1 ? reply : { claims: [], unknown: "Brak pomiaru jakości." },
      });
  });
  await page.reload();
  await chat.click();
  const question = page.getByRole("textbox", { name: "Pytanie do AI" });
  const send = page.getByRole("button", { name: "Wyślij pytanie" });
  const log = page.getByRole("log", { name: "Rozmowa o aplikacji" });
  await question.fill("Co zrobił kandydat?");
  await send.click();
  await expect(log).toContainText(reply.claims[0].text);
  await log.getByText("Odpowiedź kandydata · akapit 1").click();
  await expect(log.getByText(/Pomagałem wdrożyć asystenta/)).toBeVisible();
  await question.fill("A czy zmierzono jakość?");
  await send.click();
  await expect(page.getByRole("alert")).toHaveText(
    "Nie udało się uzyskać odpowiedzi. Spróbuj ponownie.",
  );
  await expect(question).toHaveValue("A czy zmierzono jakość?");
  await send.click();
  await expect(log).toContainText("Nieustalone. Brak pomiaru jakości.");
  expect(requests).toEqual([
    { applicationId: "application-i02", question: "Co zrobił kandydat?", history: [] },
    ...Array.from({ length: 2 }, () => ({
      applicationId: "application-i02",
      question: "A czy zmierzono jakość?",
      history: [{ question: "Co zrobił kandydat?", reply }],
    })),
  ]);
  await page.getByRole("tab", { name: "Własny wkład" }).click();
  await page.getByRole("tab", { name: "Zapytaj AI" }).click();
  await expect(log).toContainText("A czy zmierzono jakość?");
});

test("I02 review and chat use the current application and keep recruiter drafts separate", async ({
  page,
}) => {
  const fixture = initialState();
  const candidate = fixture.people.find((person) => person.id === "candidate-anna")!;
  const job = fixture.jobs.find((item) => item.slug === "ai-product-manager")!;
  const answer =
    "Zaprojektowałam proces automatyzacji i przeprowadziłam badania użytkowników. Wynik: krótszy czas obsługi zgłoszeń o 30%.";
  const captured: unknown[] = [];
  await page.route("**/api/i02/chat", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { available: true } });
      return;
    }
    captured.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        claims: [
          { text: "Kandydatka opisuje zaprojektowanie procesu.", sourceIds: ["answer-first"] },
        ],
        unknown: "",
      },
    });
  });

  await application(page);
  await choose(page, "Karolina Wiśniewska");
  await page.goto("/#/app/kandydaci");
  await page.getByRole("link", { name: "Anna Kowalska", exact: true }).click();
  const applicationUrl = page.url();
  const applicationId = applicationUrl.split("/").at(-1);
  const review = page.getByRole("region", { name: "Przejrzyj doświadczenie z AI" });
  const note = page.getByRole("textbox", { name: "Uzasadnienie", exact: true });
  const openReview = page.getByRole("button", {
    name: "Przejrzyj doświadczenie z AI",
    exact: true,
  });
  await openReview.press("Enter");
  await expect(review).toContainText("Co kandydat opisuje jako swój własny wkład");
  await review.getByRole("button", { name: "Przejdź do odpowiedzi" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Przesłana aplikacja" })).toBeFocused();
  await review.getByRole("button", { name: "Użyj pytania w czacie" }).press("Enter");
  const question = page.getByRole("textbox", { name: "Pytanie do AI" });
  const log = page.getByRole("log");
  await expect(question).toHaveValue(
    "Co kandydat opisuje jako swój własny wkład i za co odpowiadał?",
  );
  await page.getByRole("button", { name: "Wyślij pytanie" }).click();
  await expect(log).toContainText("Kandydatka opisuje zaprojektowanie procesu.");
  await log.getByText("Odpowiedź kandydata", { exact: true }).click();
  await expect(log.getByText(answer, { exact: true })).toBeVisible();
  expect(captured[0]).toEqual({
    applicationId,
    question: "Co kandydat opisuje jako swój własny wkład i za co odpowiadał?",
    history: [],
    materials: { answer, cv: candidate.cv, jobTitle: job.title, roleDescription: job.description },
  });

  await page.getByRole("combobox", { name: "Kolejny krok" }).selectOption("defer");
  await note.fill("Wrócić do wyników badań.");
  await page.getByRole("button", { name: "Zapisz notatkę" }).click();
  await page.goto("/#/app/kandydaci/application-example");
  await expect(note).toHaveValue("");
  await page.getByRole("button", { name: "Zapytaj AI", exact: true }).click();
  await expect(question).toHaveValue("");
  await expect(log).toBeHidden();
  await question.fill("Co wynika z tej aplikacji?");
  await page.getByRole("button", { name: "Wyślij pytanie" }).click();
  await expect(log).toBeVisible();
  expect(captured[1]).toMatchObject({
    applicationId: "application-example",
    history: [],
    materials: {
      answer: fixture.applications.find((item) => item.id === "application-example")!.answer,
    },
  });
  await page.goto(applicationUrl);
  await page.reload();
  await expect(note).toHaveValue("Wrócić do wyników badań.");
  await expect(page.locator(".record-stage")).toHaveText("Aplikacja wysłana");

  await openReview.click();
  await page.screenshot({ path: "artifacts/i02-all-applications-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(review.getByRole("button", { name: "Użyj pytania w czacie" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/i02-all-applications-mobile.png", fullPage: true });
});

test("I02 analysis starts at submission, persists and lets the recruiter retry older applications", async ({
  page,
}) => {
  const result = {
    contribution: {
      requirement: "Masz za sobą prowadzenie produktu cyfrowego od discovery do wdrożenia.",
      claims: [
        { text: "Kandydatka opisuje zaprojektowanie procesu.", sourceIds: ["answer-first"] },
      ],
      unknown: "",
    },
    practice: {
      requirement: null,
      claims: [],
      unknown: "Brakuje przykładu użycia AI w codziennej pracy.",
    },
    impact: { claims: [], unknown: "Brakuje opisu metody pomiaru." },
  };
  const requests: unknown[] = [];
  let finishFirst: () => void = () => {};
  const firstResponse = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });
  await page.route("**/api/i02/analysis", async (route) => {
    requests.push(route.request().postDataJSON());
    const index = requests.length;
    if (index === 1) await firstResponse;
    await route.fulfill(index === 2 ? { status: 502, json: {} } : { json: result });
  });

  try {
    await application(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect.poll(() => requests.length).toBe(1);
    await expect(page).toHaveURL(/aplikacje\?wyslano=1/);
    expect(requests[0]).toMatchObject({
      materials: {
        answer: expect.stringContaining("Zaprojektowałam proces automatyzacji"),
        jobTitle: "AI Product Manager",
      },
    });

    await choose(page, "Karolina Wiśniewska");
    await page.goto("/#/app/kandydaci");
    await page.getByRole("link", { name: "Anna Kowalska", exact: true }).click();
    const open = page.getByRole("button", { name: "Przejrzyj doświadczenie z AI", exact: true });
    const review = page.getByRole("region", { name: "Przejrzyj doświadczenie z AI" });
    await open.click();
    await expect(review).toContainText("Trwa przygotowanie analizy zgłoszenia…");
    finishFirst();
    await expect(review).toContainText(result.contribution.claims[0].text);
    await expect(review).toContainText(`Wymaganie. ${result.contribution.requirement}`);
    await expect(review).toContainText(`Co wynika. ${result.contribution.claims[0].text}`);
    await expect(review).toContainText("Nieustalone. Nie wskazano dodatkowych braków");
    await review.getByText("Odpowiedź kandydata", { exact: true }).click();
    await expect(review.getByText(/Zaprojektowałam proces automatyzacji/)).toBeVisible();
    await review.getByRole("tab", { name: "Własny wkład" }).press("ArrowDown");
    await expect(review.getByRole("tab", { name: "Użycie w pracy" })).toBeFocused();
    await expect(review).toContainText("Wymaganie. Nie udało się wskazać konkretnego wymagania");
    await expect(review).toContainText(
      "Co wynika. Z dostępnych materiałów nie można wyciągnąć wniosku.",
    );
    await expect(review).toContainText(`Nieustalone. ${result.practice.unknown}`);
    await expect(review.getByRole("button", { name: "Dopytaj w czacie" })).toBeVisible();
    await review.getByRole("tab", { name: "Użycie w pracy" }).press("ArrowDown");
    await expect(review).toContainText("Wymaganie. W zapisanej analizie nie ustalono wymagania");
    await expect(review).toContainText(`Nieustalone. ${result.impact.unknown}`);
    await page.reload();
    await open.click();
    await expect(review).toContainText(result.contribution.claims[0].text);
    await expect(review).toContainText(result.contribution.requirement);
    await expect(page.locator(".record-stage")).toHaveText("Aplikacja wysłana");
    expect(requests).toHaveLength(1);

    await page.goto("/#/app/kandydaci/application-example");
    await expect.poll(() => requests.length).toBe(2);
    await open.click();
    await expect(review).toContainText("Nie udało się przygotować analizy.");
    await review.getByRole("button", { name: "Ponów analizę" }).click();
    await expect(review).toContainText(result.contribution.claims[0].text);
    expect(requests).toHaveLength(3);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(review.getByText("Co wynika.", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  } finally {
    finishFirst();
  }
});

test("a timed-out chat preserves the question and note and can be retried", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/i02/chat", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { available: true } });
      return;
    }
    posts++;
    if (posts === 1) return;
    await route.fulfill({ json: { claims: [], unknown: "Nie podano wyniku." } });
  });
  await choose(page, "Karolina Wiśniewska");
  await page.goto(i02Route);
  const note = page.getByRole("textbox", { name: "Uzasadnienie", exact: true });
  await note.fill("Robocza notatka pozostaje po awarii.");
  await page.getByRole("button", { name: "Zapytaj AI", exact: true }).click();
  const question = page.getByRole("textbox", { name: "Pytanie do AI", exact: true });
  await expect(question).toBeVisible();
  await page.clock.install();
  await question.fill("Jak oceniono wynik?");
  await page.getByRole("button", { name: "Wyślij pytanie", exact: true }).click();
  await expect.poll(() => posts).toBe(1);
  await page.clock.runFor(50_001);
  await page.clock.resume();
  await expect(page.getByRole("alert")).toHaveText(
    "Nie udało się uzyskać odpowiedzi. Spróbuj ponownie.",
  );
  await expect(question).toHaveValue("Jak oceniono wynik?");
  await expect(note).toHaveValue("Robocza notatka pozostaje po awarii.");
  await page.getByRole("button", { name: "Wyślij pytanie", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Nie podano wyniku.");
  await expect(question).toHaveValue("");
});

test("a timed-out analysis releases the queue and can be retried after reload", async ({
  page,
}) => {
  let requests = 0;
  const result = {
    contribution: { claims: [], unknown: "Nie podano własnego wkładu." },
    practice: { claims: [], unknown: "Nie podano użycia AI." },
    impact: { claims: [], unknown: "Nie podano wyniku." },
  };
  await page.route("**/api/i02/analysis", async (route) => {
    requests++;
    if (requests === 1) return;
    await route.fulfill({ json: result });
  });
  await page.goto("/");
  const scenario = initialState();
  scenario.activePersonId = "employer-brightlabs";
  scenario.applications.forEach((record) => {
    record.experienceAnalysis = { status: "pending", roleDescription: "Fikcyjna rola" };
  });
  await seedRaw(page, JSON.stringify(scenario));
  await page.clock.install();
  await page.reload();
  await expect.poll(() => requests).toBe(1);
  await page.clock.runFor(50_001);
  await page.clock.resume();
  await expect
    .poll(() =>
      storedScenario(page).then((state) =>
        state.applications.map(
          (record: { experienceAnalysis: { status: string } }) => record.experienceAnalysis.status,
        ),
      ),
    )
    .toEqual(["failed", "ready"]);
  expect(requests).toBe(2);
  await page.reload();
  await page.goto("/#/app/kandydaci/application-example");
  const open = page.getByRole("button", { name: "Przejrzyj doświadczenie z AI", exact: true });
  await open.click();
  const review = page.getByRole("region", { name: "Przejrzyj doświadczenie z AI" });
  await expect(review).toContainText("Nie udało się przygotować analizy.");
  await review.getByRole("button", { name: "Ponów analizę", exact: true }).click();
  await expect(review).toContainText("Nie podano własnego wkładu.");
  expect(requests).toBe(3);
});
