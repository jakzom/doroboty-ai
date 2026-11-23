import { describe, expect, it } from "vitest";
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

  it("disables automatic content capture while keeping only known workflow log bodies", () => {
    const options = posthogOptions("https://posthog.test", "test");
    expect(options).toMatchObject({
      autocapture: false,
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
