# Privacy-safe PostHog Autocapture

## Intent

Enable automatic public-interface click analytics while excluding places where people enter or view private information. Preserve the existing anonymous identity, normalized pageviews and explicit workflow events.

## Acceptance criteria

- Capture clicks only on reviewed public interface selectors and public hash routes; reject unknown routes, authentication/persona selection, application forms and every workspace screen.
- Exclude forms, editable controls, dialogs, private-data markers and search/filter values, including content rendered through portals.
- Mask all DOM text and attributes in the SDK. Before delivery, retain only bounded element structure and approved SDK context for autocaptured clicks; exclude copied text, URLs containing query/record identifiers and arbitrary DOM properties.
- Keep replay, automatic exceptions and performance capture disabled. Keep unconfigured builds usable without telemetry.
- Update the behavior register, privacy copy and setup documentation. Cover allowed clicks and blocked private interactions in browser and unit tests with mocked ingestion and synthetic sentinels.
- Run ./scripts/verify using Node.js 24 and provisioned Chrome, then perform a separate review pass. Record actual results and deployment limits.

## Workspace

Current GitHub main is e6f8ac1. Implementation uses a separate checkout in /private/tmp/doroboty-autocapture-20261123 on codex/privacy-safe-autocapture because the original workspace has unrelated uncommitted changes and predates the merged PostHog integration.

## Implementation and separate review

Enabled click-only SDK Autocapture with both URL and selector allowlists. Excluded form/editable/dialog/private-marker subtrees and every non-public route, including private content rendered through portals. All DOM text and attributes are masked. The outbound Autocapture filter reconstructs only tag names and bounded sibling positions, normalizes URLs and removes text, classes, identifiers, destinations, selected content, arbitrary attributes and person updates. It supports both SDK element arrays and the remote chain-only format without forwarding raw chains. Existing workflow events, anonymous identity and the disabled replay/error/performance settings remain intact. Updated BRIEF.md, FEATURES.md, README.md and Polish privacy copy; no layout, controller or imported reference changes were needed.

A separate source review checked selectors against actual page structure, checked the installed SDK's ancestor matching and remote format behavior, and checked both collection and delivery exclusions. This caught missing heading ancestors for job-title links; the supported structural tag set and a real title-link browser check now cover them. The first full gate passed its non-browser stages and 63 existing browser journeys, but the two new journeys exposed the SDK's default hash stripping (public clicks were grouped as home). The filter now reads the actual browser HashRouter location and normalizes it before delivery, preserving default hash suppression for other SDK events. Added a regression test for public and private locations when SDK context lacks the hash. The focused rerun passed all three analytics journeys at desktop/mobile widths and for both remote payload formats. Tests intercept all PostHog traffic and use synthetic sentinels; they do not transmit test text to a real account.

## Validation environment

Node.js 24.22.3 and npm 12.2.3 use the existing temporary runtime; Chrome uses the already installed application with PLAYWRIGHT_CHANNEL=chrome. Offline npm ci could not resolve an uncached tarball. Reused the existing installed dependencies from /private/tmp/doroboty-posthog-20261123 after confirming package-lock.json is byte-identical. The sandbox initially blocked localhost binding with EPERM; the approved verification run can start the local test servers. No browser or OS dependency was installed.

## Final evidence and release boundary

The final `PLAYWRIGHT_CHANNEL=chrome ./scripts/verify` passed on Node.js 24: formatting, Orbital/historical reference integrity, lint, types, 70 unit tests, hosted Node ESM endpoint loading, baseline packet verification, static build and 65 browser journeys. The added journeys cover desktop 1280px and mobile 390px, keyboard activation, both SDK payload formats, form/editable/dialog/private-marker exclusions, private profile/persona routes, and a real public job-title link containing synthetic text and an augmentation attribute. Neither sentinel reaches mocked ingestion. Existing application/CV/recruiter, accessibility, persistence, recovery and hosted-AI flows passed as part of the full gate.

A final separate diff review found no changes to domain state, server/API/provider code, deployment configuration, dependencies or imported design references. Changes are prepared on `codex/privacy-safe-autocapture` for pull-request review. This task has not merged or deployed the change or verified the live PostHog dashboard. Local intercepted ingestion is evidence about the outgoing browser payload, not production delivery.

Future Autocapture additions must review both selector and route scope; masking text alone does not exclude private interactions. Keep the SDK hash-stripping and remote chain-only format regression coverage when updating PostHog.
