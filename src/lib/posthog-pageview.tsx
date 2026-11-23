import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useConfiguredPostHog } from "./posthog-logger";
import { analyticsRoute } from "./posthog-config";

export function PostHogPageview() {
  const { pathname } = useLocation();
  const posthog = useConfiguredPostHog();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!posthog || lastPath.current === pathname) return;
    lastPath.current = pathname;
    const route = analyticsRoute(pathname);
    posthog.capture("$pageview", {
      route,
      $pathname: route,
      $current_url: `${window.location.origin}/#${route}`,
    });
  }, [posthog, pathname]);
  return null;
}
