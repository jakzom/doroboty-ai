import { describe, expect, it, vi } from "vitest";
import {
  analyticsRoute,
  analyticsUrl,
  posthogOptions,
  sanitizeAnalyticsEvent,
} from "./posthog-config";

describe("prototype analytics boundaries", () => {
  it("groups record routes and excludes search text, identifiers and unknown paths", () => {
    expect(analyticsRoute("/oferty?query=private-text")).toBe("/oferty");
    expect(analyticsRoute("/app/kandydaci/private-name")).toBe("/app/kandydaci/:id");
    expect(analyticsRoute("/private-free-text")).toBe("/not-found");
    expect(analyticsUrl("https://example.test/?token=private#/oferty?query=private")).toBe(
      "https://example.test/#/oferty",
    );
  });

  it("retains workflow metadata without free text or person profile updates", () => {
    const event = sanitizeAnalyticsEvent({
      uuid: "synthetic-event",
      event: "application_submitted",
      properties: {
        token: "phc_test",
        distinct_id: "anonymous-browser",
        job_category: "Build",
        answer: "private-answer",
        cv: "private-cv",
        $current_url: "https://example.test/#/aplikuj/private-role?query=secret",
        $set: { name: "private-name" },
      },
      $set: { name: "private-name" },
      $set_once: { email: "private-email" },
    });
    expect(event?.properties.job_category).toBe("Build");
    expect(JSON.stringify(event)).not.toMatch(/private|secret/);
    expect(event?.properties.token).toBe("phc_test");
    expect(event?.properties.distinct_id).toBe("anonymous-browser");
  });

  it("rejects unapproved DOM and exception payloads", () => {
    for (const event of ["$autocapture", "$exception", "arbitrary_event"])
      expect(
        sanitizeAnalyticsEvent({ uuid: "test", event, properties: { text: "private" } }),
      ).toBeNull();
  });

  it("keeps only click structure and safe context on public routes", () => {
    const event = sanitizeAnalyticsEvent({
      uuid: "test",
      event: "$autocapture",
      properties: {
        token: "phc_test",
        distinct_id: "anonymous-browser",
        $event_type: "click",
        $current_url: "https://example.test/?secret=private#/oferty?query=private",
        $title: "private-title",
        $el_text: "private-text",
        $elements_chain: "private-chain",
        $selected_content: "private-clipboard",
        $set: { name: "private-name" },
        $elements: [
          {
            tag_name: "button",
            nth_child: 2,
            nth_of_type: 1,
            $el_text: "private-text",
            attr__id: "private-id",
            attr__href: "private-url",
            attr__class: "private-class",
            "attr__data-ph-capture-attribute-email": "private-email",
          },
          { tag_name: "div", nth_child: "private-value" },
        ],
      },
      $set: { name: "private-name" },
    });
    expect(event?.properties).toEqual({
      token: "phc_test",
      distinct_id: "anonymous-browser",
      $event_type: "click",
      $current_url: "https://example.test/#/oferty",
      route: "/oferty",
      $elements: [{ tag_name: "button", nth_child: 2, nth_of_type: 1 }, { tag_name: "div" }],
    });
    expect(JSON.stringify(event)).not.toContain("private");
  });

  it.each([
    "/#/app/profil",
    "/#/app/profil/podglad",
    "/#/app/aplikacje/private-id",
    "/#/app/kandydaci/private-id",
    "/#/app/oferty/nowa",
    "/#/app/organizacja",
    "/#/app/settings",
    "/#/auth/sign-in",
    "/#/aplikuj/private-role",
    "/#/unknown",
    "/private-path",
    "/#/oferty/private-role/private-section",
  ])("rejects autocapture on private or unknown location %s", (path) => {
    expect(
      sanitizeAnalyticsEvent({
        uuid: "test",
        event: "$autocapture",
        properties: {
          $event_type: "click",
          $current_url: `https://example.test${path}`,
          $elements: [{ tag_name: "button" }],
        },
      }),
    ).toBeNull();
  });

  it.each([
    "/",
    "/#/",
    "/#/oferty",
    "/#/oferty/public-role",
    "/#/firmy/public-company",
    "/#/metodologia",
    "/#/polityka-prywatnosci",
  ])("allows reviewed public location %s", (path) => {
    expect(
      sanitizeAnalyticsEvent({
        uuid: "test",
        event: "$autocapture",
        properties: {
          $event_type: "click",
          $current_url: `https://example.test${path}`,
          $elements: [{ tag_name: "a" }],
        },
      }),
    ).not.toBeNull();
  });

  it("rejects editable element trees, non-click events and missing click structure", () => {
    const base = {
      $event_type: "click",
      $current_url: "https://example.test/#/oferty",
      $elements: [{ tag_name: "button" }],
    };
    for (const override of [
      { $event_type: "change" },
      { $event_type: "submit" },
      { $event_type: "copy" },
      { $elements: [] },
      { $elements: [{ tag_name: "input" }] },
      { $elements: [{ tag_name: "button" }, { tag_name: "form" }] },
      { $current_url: undefined },
    ])
      expect(
        sanitizeAnalyticsEvent({
          uuid: "test",
          event: "$autocapture",
          properties: { ...base, ...override },
        }),
      ).toBeNull();
  });

  it("supports the remote chain-only SDK format without forwarding text or attributes", () => {
    const base = { $event_type: "click", $current_url: "https://example.test/#/oferty" };
    const event = sanitizeAnalyticsEvent({
      uuid: "test",
      event: "$autocapture",
      properties: {
        ...base,
        $elements_chain: 'button:nth-child="2"nth-of-type="1";body:nth-child="1"nth-of-type="1"',
      },
    });
    expect(event?.properties.$elements).toEqual([
      { tag_name: "button", nth_child: 2, nth_of_type: 1 },
      { tag_name: "body", nth_child: 1, nth_of_type: 1 },
    ]);
    expect(event?.properties.$elements_chain).toBeUndefined();
    for (const chain of [
      'button:nth-child="1"nth-of-type="1"text="private"',
      'button.private:nth-child="1"nth-of-type="1"',
      'input:nth-child="1"nth-of-type="1"',
      'button:nth-child="1"nth-of-type="1";broken',
    ])
      expect(
        sanitizeAnalyticsEvent({
          uuid: "test",
          event: "$autocapture",
          properties: { ...base, $elements_chain: chain },
        }),
      ).toBeNull();
  });

  it("uses the browser hash route even when SDK context has stripped it", () => {
    const event = {
      uuid: "test",
      event: "$autocapture",
      properties: {
        $event_type: "click",
        $current_url: "https://example.test/",
        $elements: [{ tag_name: "button" }],
      },
    };
    try {
      vi.stubGlobal("window", {
        location: { href: "https://example.test/#/oferty?query=private" },
      });
      expect(sanitizeAnalyticsEvent(event)?.properties.route).toBe("/oferty");
      vi.stubGlobal("window", { location: { href: "https://example.test/#/app/profil" } });
      expect(sanitizeAnalyticsEvent(event)).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("restricts automatic clicks and disables other automatic content capture", () => {
    const options = posthogOptions("https://posthog.test", "test");
    expect(options).toMatchObject({
      autocapture: {
        dom_event_allowlist: ["click"],
        element_allowlist: ["a", "button"],
        capture_copied_text: false,
      },
      mask_all_text: true,
      mask_all_element_attributes: true,
      disable_session_recording: true,
      capture_exceptions: false,
      capture_pageview: false,
    });
    const filter = options.logs?.beforeSend;
    expect(typeof filter).toBe("function");
    if (typeof filter !== "function") throw new Error("Missing log boundary");
    expect(filter({ body: "private arbitrary text" })).toBeNull();
    const log = filter({
      body: "application submitted",
      attributes: { workflow: "application_submission", answer: "private-answer" },
    });
    expect(log?.attributes?.workflow).toBe("application_submission");
    expect(JSON.stringify(log)).not.toContain("private-answer");
  });
});
