import type { BeforeSendFn, PostHogConfig } from "posthog-js";

const events = new Set([
  "$autocapture",
  "$pageview",
  "profile_saved",
  "application_submitted",
  "application_draft_saved",
  "application_withdrawn",
  "application_stage_updated",
  "application_ai_question_submitted",
  "recruiter_note_saved",
  "job_published",
  "job_search_submitted",
  "job_saved",
  "job_unsaved",
]);
// Fail closed for workspace, application, persona, unknown and non-hash routes.
const publicClickUrl =
  /^https?:\/\/[^/?#]+\/(?:\?[^#]*)?(?:#\/(?:oferty(?:\/[^/?#]+)?|firmy\/[^/?#]+|metodologia|polityka-prywatnosci)?(?:\?[^#]*)?)?$/;
const clickContext = new Set([
  "token",
  "distinct_id",
  "persona_id",
  "persona_role",
  "$session_id",
  "$window_id",
  "$lib",
  "$lib_version",
  "$browser",
  "$browser_version",
  "$os",
  "$os_version",
  "$device_type",
]);
const elementTags = new Set([
  "a",
  "button",
  "span",
  "svg",
  "path",
  "div",
  "header",
  "nav",
  "main",
  "section",
  "article",
  "footer",
  "body",
  "html",
  "p",
  "strong",
  "b",
  "small",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "aside",
  "i",
  "em",
]);

function sanitizeClick(properties: Record<string, unknown>) {
  // The SDK defaults strip URL hashes. Read the actual HashRouter location,
  // then normalize it below; never enable raw hash capture for other events.
  const url = typeof window === "undefined" ? properties.$current_url : window.location.href;
  if (properties.$event_type !== "click" || typeof url !== "string" || !publicClickUrl.test(url))
    return null;
  let route: string;
  try {
    route = analyticsRoute(new URL(url).hash.slice(1) || "/");
  } catch {
    return null;
  }
  // Remote SDK configuration can switch to chain-only payloads. Accept only the
  // exact masked grammar and reconstruct structure rather than forwarding a chain.
  let source = properties.$elements;
  if (!Array.isArray(source) && typeof properties.$elements_chain === "string") {
    if (properties.$elements_chain.length > 8192) return null;
    source = properties.$elements_chain.split(";").map((part) => {
      const match = /^([a-z][a-z0-9]*):nth-child="(\d{1,5})"nth-of-type="(\d{1,5})"$/.exec(part);
      return match
        ? { tag_name: match[1], nth_child: Number(match[2]), nth_of_type: Number(match[3]) }
        : null;
    });
  }
  if (!Array.isArray(source) || !source.length || source.length > 32) return null;
  const elements = [];
  for (const element of source) {
    if (!element || !elementTags.has(element.tag_name)) return null;
    // DOM text, class/id, href, attributes and SDK element chains never leave the browser.
    const safe: Record<string, string | number> = { tag_name: element.tag_name };
    for (const key of ["nth_child", "nth_of_type"])
      if (Number.isInteger(element[key]) && element[key] >= 0 && element[key] <= 10000)
        safe[key] = element[key];
    elements.push(safe);
  }
  const context = Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        clickContext.has(key) &&
        ((typeof value === "string" && value.length <= 200) || typeof value === "number"),
    ),
  );
  return {
    ...context,
    $event_type: "click",
    $elements: elements,
    $current_url: analyticsUrl(url),
    route,
  };
}
const metadata = new Set([
  "token",
  "distinct_id",
  "job_category",
  "remote_status",
  "is_new_job",
  "has_query",
  "has_location",
  "application_stage",
  "previous_stage",
  "next_stage",
  "proposed_step",
  "has_application_materials",
  "persona_id",
  "persona_role",
  "route",
]);
const logMessages = new Set(["application submitted", "application withdrawn", "job published"]);
const staticRoutes = new Set([
  "/",
  "/oferty",
  "/metodologia",
  "/polityka-prywatnosci",
  "/auth/sign-in",
  "/auth/sign-up",
  "/app",
  "/app/onboarding",
  "/app/profil",
  "/app/profil/podglad",
  "/app/zapisane",
  "/app/aplikacje",
  "/app/oferty",
  "/app/kandydaci",
  "/app/organizacja",
  "/app/case",
  "/app/settings",
]);

export function analyticsRoute(path: string) {
  const pathname = path.split(/[?#]/)[0];
  if (staticRoutes.has(pathname)) return pathname;
  for (const prefix of [
    "/oferty/",
    "/firmy/",
    "/aplikuj/",
    "/app/aplikacje/",
    "/app/kandydaci/",
    "/app/oferty/",
  ])
    if (pathname.startsWith(prefix)) return `${prefix}:id`;
  return "/not-found";
}

export function analyticsUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    const route = url.hash.startsWith("#/") ? analyticsRoute(url.hash.slice(1)) : "";
    return `${url.origin}${url.pathname}${route ? `#${route}` : ""}`;
  } catch {
    return "";
  }
}

// Keep only explicit workflow metadata and scrub SDK URL/person properties.
export const sanitizeAnalyticsEvent: BeforeSendFn = (event) => {
  if (!events.has(event.event)) return null;
  if (event.event === "$autocapture") {
    const properties = sanitizeClick(event.properties ?? {});
    if (!properties) return null;
    delete event.$set;
    delete event.$set_once;
    return { ...event, properties };
  }
  const properties = Object.fromEntries(
    Object.entries(event.properties ?? {}).filter(
      ([key]) =>
        metadata.has(key) ||
        (key.startsWith("$") && !["$set", "$set_once", "$elements", "$el_text"].includes(key)),
    ),
  );
  for (const [key, value] of Object.entries(properties)) {
    if (/url|referrer|pathname/i.test(key)) {
      properties[key] = /pathname/i.test(key) ? analyticsRoute(String(value)) : analyticsUrl(value);
    }
  }
  delete event.$set;
  delete event.$set_once;
  return { ...event, properties };
};

export function posthogOptions(host: string, environment: string): Partial<PostHogConfig> {
  return {
    api_host: host,
    defaults: "2026-08-30",
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: {
      url_allowlist: [publicClickUrl],
      dom_event_allowlist: ["click"],
      element_allowlist: ["a", "button"],
      css_selector_allowlist: [
        ".site-header a",
        ".site-footer a",
        ".home-intro a",
        ".orbital-route-card a",
        ".pp-category-tab",
        ".pp-view-link",
        ".pp-detail-button",
        ".pp-job-title a",
        ".pp-job-company",
        ".pp-pagination a",
        "a.back-link",
      ],
      css_selector_ignorelist: [
        ".ph-no-capture",
        ".ph-sensitive",
        ".ph-no-autocapture",
        "[data-ph-no-autocapture]",
        "[data-sensitive]",
        "[data-private]",
        "form",
        "input",
        "textarea",
        "select",
        "option",
        "label",
        '[contenteditable]:not([contenteditable="false"])',
        '[role="textbox"]',
        '[role="dialog"]',
        "dialog",
        '[role="alertdialog"]',
        ".site-user-links",
        ".pp-active-filters",
      ],
      capture_copied_text: false,
    },
    mask_all_text: true,
    mask_all_element_attributes: true,
    disable_session_recording: true,
    capture_exceptions: false,
    capture_performance: false,
    disable_surveys: true,
    before_send: sanitizeAnalyticsEvent,
    logs: {
      serviceName: "doroboty-ai-web",
      environment,
      beforeSend(record) {
        if (!logMessages.has(record.body)) return null;
        record.attributes = {
          ...Object.fromEntries(
            Object.entries(record.attributes ?? {}).filter(
              ([key]) => metadata.has(key) || key === "workflow",
            ),
          ),
          "url.full": typeof window === "undefined" ? "" : analyticsUrl(window.location.href),
        };
        return record;
      },
    },
  };
}
