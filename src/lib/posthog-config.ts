import type { BeforeSendFn, PostHogConfig } from "posthog-js";

const events = new Set([
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
    autocapture: false,
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
