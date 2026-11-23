import { usePostHog } from "@posthog/react";

type LogAttributes = Record<string, string | number | boolean>;

const isPostHogConfigured = Boolean(
  import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN && import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
);

export function useConfiguredPostHog() {
  const posthog = usePostHog();
  return isPostHogConfigured ? posthog : undefined;
}

export function usePrototypeLogs() {
  const posthog = useConfiguredPostHog();

  return {
    info(message: string, attributes: LogAttributes) {
      posthog?.logger.info(message, attributes);
    },
  };
}
