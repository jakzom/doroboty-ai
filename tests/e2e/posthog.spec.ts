import { gunzipSync } from "node:zlib";
import { test, expect, type Request } from "@playwright/test";
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

test("configured PostHog captures hash navigation and workflow metadata without form text", async ({
  page,
}) => {
  // The SDK intentionally filters WebDriver sessions; exercise a normal visitor here.
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
    await route.fulfill({ json: { status: 1, featureFlags: {} } });
  });
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
  expect(JSON.stringify(payloads)).not.toMatch(/synthetic-private/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/polityka-prywatnosci");
  await expect(page.getByText("Jeśli analityka jest włączona", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
