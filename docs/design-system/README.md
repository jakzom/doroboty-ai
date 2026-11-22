# DoRoboty.ai — Orbital B.02

Orbital B.02 v1.2 is the visual direction explicitly approved for the stage-2 migration. It supersedes Poster People. The complete local reference is [orbital/styl.html](orbital/styl.html); the previous 67-file [agent-kit](agent-kit/design.md) remains immutable historical evidence.

Read the product contract in BRIEF.md, CASE_PROTOCOL.md and FEATURES.md, then this guide, [implementation rules](IMPLEMENTATION.md), [host APIs](HOST-COMPONENTS.md), [record APIs](RECORDS.md) and [acceptance checklist](VERIFICATION.md). Inspect the rendered reference and affected application before choosing geometry. Current app code is implementation to verify, not another visual authority.

## Reference and commands

Use Node 24 and npm from the repository root:

```sh
npm run design-system:dev
npm run design-system:check
```

The server opens http://127.0.0.1:8952/orbital/styl.html. The complete listing, offer, application, publication, recruiter, editorial, brand and interaction-state examples are linked there. `UI_KIT_PORT=8953` selects another port. The product runs separately at http://127.0.0.1:3001/. No additional installation or global skill is required.

[Orbital tokens](orbital/tokens.css), [typography](orbital/typography.css), [listing](orbital/listing.css), [orbital overrides](orbital/orbital.css), [workflow](orbital/workflow.css), [publication](orbital/publish.css) and [catalog](orbital/styl.html) are the imported source. The [manifest](orbital/source-manifest.json) checks its original bytes. The old kit's manifest and six standalone tests still run separately. These checks do not verify the React screens.

## Fixed visual decisions

- Warm paper #f5efdf, surface #fffaf0, text #272e28, muted #5f6255, divider #d4ccb9 and atlas rule #a8ac98.
- Local variable Syne for wordmark/display headings; local Inter for UI, data and job titles, including the full offer title. Wordmark 24px/750, tracking −.048em; mobile 21px/700.
- One purple action #7840a4, hover #65358a, white action text; focus #2146b0. Build #155bc0, Apply #0b7255, Lead #7840a4, with their imported tints. Categories and statuses express different facts. MatchScore retains its documented scenario bands as an explicit host exception.
- Controls 10px, panels 14px, capsule facets. Containers min(1190px, 100% − 80px), wide min(1250px, 100% − 112px), then 42/36/28px total gutters at 920/630/360px.
- Listing: spacious entry/atlas, separate search, category → location → work mode, advanced filters, results. Reuse the same compact job row everywhere. Pay remains a plain fact with currency/period/agreement and explicit missing data.
- Offer: identity, full Inter title and facts; reading alongside sticky terms/actions; at <=700px terms/actions precede reading. Editorial pages use the supplied static atlas. Workflow forms and records use quiet panels.
- Shared public navigation: logo, Oferty, O DoRoboty.ai, Panel rekrutera, Dodaj ofertę. All links remain available on mobile; the host retains persona/account actions.

## React boundaries

Adapt the source anatomy in existing React/Base UI components and host tokens. Keep `render`, hash routes, Zod/domain operations, persistent local state and human review/approval. Do not import reference controllers, fixtures, reset or string renderers into the product. Source examples are demonstrations, not the richer teaching application's data or workflows.

Product assets resolve through Vite from src/app/fonts and src/assets/orbital. Both font licenses are included. No remote runtime fonts/assets or private filesystem paths are needed. Keep imported reference files unchanged; add host documentation beside them and implement product changes in src/ and tokens.css. New variants must be documented in the host catalog with their scope and states.

The participant package includes this complete local guide/reference and the baseline application. Historical case evidence and instructor/task materials remain excluded by the packaging protocol.
