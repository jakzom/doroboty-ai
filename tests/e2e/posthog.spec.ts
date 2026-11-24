import { gunzipSync } from "node:zlib";
import { test, expect, type Page, type Request } from "@playwright/test";
import { choose } from "./persona";

function decode(request: Request) {
  let bytes = request.postDataBuffer();
  if (!bytes) return null;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
  const text = bytes.toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    const data = new URLSearchParams(text).get("data");
    return data ? JSON.parse(Buffer.from(data, "base64").toString("utf8")) : null;
  }
}

async function observePostHog(page: Page, chainOnly = false) {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "webdriver", { get: () => false }),
  );
  const events: Array<{ event: string; properties: Record<string, unknown> }> = [];
  const payloads: unknown[] = [];
  await page.route("https://posthog.test/**", async (route) => {
    if (route.request().method() === "POST") {
      const body = decode(route.request());
      payloads.push(body);
      for (const event of Array.isArray(body) ? body : (body?.batch ?? [body]))
        if (event?.event) events.push(event);
    }
    await route.fulfill({
      json: {
        status: 1,
        featureFlags: {},
        autocapture_opt_out: false,
        elementsChainAsString: chainOnly,
      },
    });
  });
  return { events, payloads };
}

test("configured PostHog captures hash navigation and workflow metadata without form text", async ({
  page,
}) => {
  // The SDK intentionally filters WebDriver sessions; exercise a normal visitor here.
  const { events, payloads } = await observePostHog(page);
  await page.goto("/");
  await expect
    .poll(() => events.some((x) => x.event === "$pageview" && x.properties.route === "/"))
    .toBe(true);
  await page.goto("/#/oferty?query=synthetic-private-search");
  await expect
    .poll(() => events.some((x) => x.event === "$pageview" && x.properties.route === "/oferty"))
    .toBe(true);
  await choose(page, "Anna Kowalska");
  await page.goto("/#/app/profil");
  await page.getByLabel("Imię i nazwisko").fill("synthetic-private-profile");
  await page.getByRole("button", { name: "Zapisz profil", exact: true }).click();
  await expect.poll(() => events.some((x) => x.event === "profile_saved")).toBe(true);
  const saved = events.find((x) => x.event === "profile_saved")!;
  expect(saved.properties.persona_id).toBe("candidate-anna");
  expect(saved.properties.distinct_id).not.toBe("candidate-anna");
  expect(events.filter((event) => event.event === "$autocapture")).toHaveLength(0);
  expect(JSON.stringify(payloads)).not.toMatch(/synthetic-private/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/polityka-prywatnosci");
  await expect(page.getByText("Jeśli analityka jest włączona", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [width, chainOnly] of [
  [1280, false],
  [390, true],
] as const) {
  test(`public clicks exclude private DOM and private routes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { events, payloads } = await observePostHog(page, chainOnly);
    const clicks = () => events.filter((event) => event.event === "$autocapture");
    await page.goto("/#/oferty?query=synthetic-private-search");
    await expect.poll(() => events.some((event) => event.event === "$pageview")).toBe(true);
    const build = page.locator(".pp-category-tab").filter({ hasText: "Build" });
    await build.click();
    await expect.poll(() => clicks().length).toBe(1);
    expect(clicks()[0].properties.route).toBe("/oferty");
    expect(clicks()[0].properties.$elements).toEqual(
      expect.arrayContaining([expect.objectContaining({ tag_name: "button" })]),
    );

    // Synthetic fixtures deliberately match reviewed selectors inside excluded containers.
    const blocked = [
      "form",
      "sensitive",
      "private",
      "editable",
      "dialog",
      "no-capture",
      "no-autocapture",
      "attribute",
      "unreviewed",
    ];
    await page.evaluate((names) => {
      const fixture = document.createElement("section");
      fixture.id = "privacy-fixture";
      for (const name of names) {
        const container = document.createElement(name === "form" ? "form" : "div");
        if (name === "sensitive") container.dataset.sensitive = "";
        if (name === "private") container.dataset.private = "";
        if (name === "editable") container.contentEditable = "true";
        if (name === "dialog") container.setAttribute("role", "dialog");
        if (name === "no-capture") container.className = "ph-no-capture";
        if (name === "no-autocapture") container.className = "ph-no-autocapture";
        if (name === "attribute") container.dataset.phNoAutocapture = "";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `synthetic-private-${name}`;
        if (name !== "unreviewed") button.className = "pp-category-tab";
        container.append(button);
        fixture.append(container);
      }
      document.body.append(fixture);
    }, blocked);
    for (const name of blocked)
      await page.getByRole("button", { name: `synthetic-private-${name}`, exact: true }).click();
    await page.getByLabel("Szukaj ofert", { exact: true }).fill("synthetic-private-input");
    await page.getByLabel("Szukaj ofert", { exact: true }).click();
    await page.getByRole("button", { name: "Szukaj", exact: true }).click();
    await expect
      .poll(() => events.some((event) => event.event === "job_search_submitted"))
      .toBe(true);
    await page.evaluate(() => document.getElementById("privacy-fixture")?.remove());
    await build.focus();
    await page.keyboard.press("Enter");
    // The next public click flushes the earlier interactions through the same SDK batch.
    await expect.poll(() => clicks().length).toBe(2);

    await page.goto("/#/oferty");
    const title = page.locator(".pp-job-title a").first();
    await title.evaluate((link) => {
      link.textContent = "synthetic-private-public-title";
      link.setAttribute("data-ph-capture-attribute-email", "synthetic-private-public-attribute");
    });
    await title.click();
    await expect.poll(() => clicks().length).toBe(3);
    expect(clicks()[2].properties.route).toMatch(/^\/oferty(?:\/:id)?$/);

    await choose(page, "Anna Kowalska");
    await page.goto("/#/app/profil");
    await page.getByLabel("Imię i nazwisko").fill("synthetic-private-profile");
    await page.getByRole("button", { name: "Zapisz profil", exact: true }).click();
    await expect.poll(() => events.some((event) => event.event === "profile_saved")).toBe(true);
    expect(clicks()).toHaveLength(3);
    expect(JSON.stringify(payloads)).not.toContain("synthetic-private");
    for (const click of clicks()) {
      expect(click.properties.$el_text).toBeUndefined();
      expect(click.properties.$title).toBeUndefined();
      expect(click.properties.$elements_chain).toBeUndefined();
      expect(JSON.stringify(click.properties.$elements)).not.toMatch(/attr__|classes|href/);
    }
  });
}
