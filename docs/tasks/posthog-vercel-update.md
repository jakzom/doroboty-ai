# PostHog Vercel update

## Intent

Deploy the user's PostHog integration from GitHub while preserving the existing hosted application AI and its request quota. Verify the complete browser-to-ingestion flow using synthetic data.

## Acceptance criteria

- Combine current GitHub main (PostHog integration) with the deployed hosted-AI changes without reverting either feature.
- Inspect analytics configuration, event payloads and private-text boundaries. Update FEATURES.md to match current behavior.
- Verify hash-route pageviews, a representative product event and ingestion responses on the published site. Distinguish HTTP ingestion acceptance from visibility in the PostHog account UI.
- Preserve unconfigured/offline participant builds and the baseline-only package. Keep credentials out of source and logs.
- Run ./scripts/verify with Node.js 24 and provisioned Chrome, perform a separate review and deploy a concrete immutable revision to the existing Vercel production project.
- Verify hosted AI availability after deployment and preserve the existing 10-request/600-second IP quota.

## Initial evidence

GitHub main is c85d525b52584ae5bed1ac87b3dfb81d0c803852. The live Vercel deployment uses hosted-AI commit 46684791b3309777054ff803ecf4ab3e46b90609, which has not been merged into main. Production already has both VITE_PUBLIC_POSTHOG_PROJECT_TOKEN and VITE_PUBLIC_POSTHOG_HOST configured, as confirmed through metadata without reading their values. Work is isolated in a new temporary checkout; preserve the user's original dirty workspace.

## Implementation notes

Combined main with the deployed hosted-AI branch in an isolated checkout. The original integration threw during development when analytics variables were absent; initialization is now optional. Added explicit HashRouter pageviews and grouped route metadata, retained the user's custom events and fixed workflow logs, and disabled automatic DOM/replay/exception/performance capture. Persona selection now annotates anonymous browser events instead of identifying every participant as the same fixture person. Updated the privacy UI and behavior register. Boundary tests cover URL/free-text exclusion and a browser journey checks pageviews plus a profile-save event through mocked ingestion.

## Separate review and local evidence

The provider adapter, server-only key boundary, Node ESM imports and WAF setup are preserved from the existing deployed revision. Reviewed the user's custom event calls: they pass only booleans and domain categories/stages. The central event filter strips form/person fields and URL query/record segments; fixed log messages override URL context before serialization. Missing analytics configuration no longer prevents startup. Reviewed React effect dependencies and StrictMode pageview deduplication. No imported design reference was changed.

The first full gate passed 47 unit tests, the emitted Node endpoint check and 62 existing browser journeys. The new analytics test initially failed because PostHog intentionally filters WebDriver sessions, then because SDK batches use an api_key/batch envelope. The test now simulates a normal visitor only within its isolated context and decodes the actual SDK envelope. Its focused rerun passed and verified pageviews, profile_saved, anonymous identity and absence of free-text sentinels. Repeat the complete gate for the final test revision before publishing.

Publish a reviewed merge revision combining current main with the previously deployed AI branch, preserving both parent histories and the original dirty workspace. A guarded fast-forward of main will keep future deployments from reverting the hosted AI fix.

The final complete ./scripts/verify passed: formatting, reference integrity, lint, types, 47 unit tests, actual Node ESM endpoint loading, baseline packet verification, static build and 63 browser journeys. A separate review found no changes to the previously deployed server/API/provider implementation or its quota configuration. Production ingestion and hosted-AI smoke checks remain pending the deployment.
