import { PostHogProvider } from "@posthog/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { App } from "./features/prototype/app";
import "./app/globals.css";
import { posthogOptions } from "./lib/posthog-config";

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const isPostHogConfigured = Boolean(posthogToken && posthogHost);

if (isPostHogConfigured) {
  posthog.init(posthogToken, posthogOptions(posthogHost, import.meta.env.MODE));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </StrictMode>,
);
