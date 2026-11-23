# DoRoboty.ai — AIPH3 prototype

A job marketplace prototype for participants to extend and test. Built with React, TypeScript and Vite, using Base UI components. The required visual direction for new and changed screens is the accepted Orbital B.02 design system.

## Design system — start here for UI work

Read [project integration instructions](docs/design-system/README.md), [host implementation rules](docs/design-system/IMPLEMENTATION.md), [host APIs](docs/design-system/HOST-COMPONENTS.md), relevant [record APIs](docs/design-system/RECORDS.md) and the [application acceptance checklist](docs/design-system/VERIFICATION.md). The active local source is [Orbital B.02 v1.2](docs/design-system/orbital/styl.html):52 original files, variable Syne/Inter and licenses, atlas, brand assets, listing/offer/workflow/editorial examples. The previous67-file Poster People kit remains immutable historical evidence under docs/design-system/agent-kit. No other chat or global skill is required.

```sh
npm run design-system:check
npm run design-system:dev
```

With Node 24, the first command verifies both imported sources and historical examples; the second serves a separate local preview at http://127.0.0.1:8952/. No kit installation is needed. The main app uses port 3001 as below.

Build UI from this system, adapting its anatomy and visual roles into the existing React/Base UI components and host tokens. Preserve application behavior and hash routing; do not replace product state with the standalone demo fixtures/controllers. The application has a host adaptation. For every UI task, compare the affected anatomy, type roles, state and keyboard behavior with the reference; passing kit checks alone does not establish visual acceptance. See the integration guide for exact reading order, assets, React mapping, responsive rules and verification. AGENTS.md and CLAUDE.md enforce the same direction.

## Run

Requirements: **Node.js 24 and npm**.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3001. No environment file, account, database or additional service is required. Package installation requires access to the npm registry.

Select Anna or Marek as a candidate, Karolina or Tomasz as an employer, or the instructor. Publish a job, apply, switch person and record the employer decision. Changes survive reload in this browser; settings provide export, import and reset. If another tab saves first, the older tab preserves its changes for export and asks you to reload before writing again. Browsers without IndexedDB offer export while keeping changes in memory. AI and scores simulate prepared scenarios. Use example CVs only.

## Local save compatibility

The scenario now uses transactional IndexedDB in this browser. On first load it imports the older version1 localStorage save, including an unreadable original for explicit recovery. The old copy is removed only after the transaction commits. JSON imports/exports stay version1. Close old application tabs before updating; the new runtime does not follow writes from an older runtime. Before reverting to an older build, export the scenario and import that file in the older build. Clearing site data removes browser-local work, so keep an export outside the browser.

## Application review and optional chat

In a fresh scenario, select Karolina Wiśniewska and open [the fictional I02 application](http://127.0.0.1:3001/#/app/kandydaci/application-i02). Use **Przejrzyj doświadczenie z AI** to review each criterion and **Zapytaj AI** for follow-up questions. These controls and the recruiter note are available on every employer-visible application. To see I02 alongside an older browser save, use a separate browser profile or export the save before resetting.

Enable the optional chat by setting `I02_OPENAI_API_KEY` in the server environment or a gitignored `.env.local`, then restart `npm run dev`. The default model is `gpt-5-mini`; `I02_OPENAI_MODEL` can select another model that supports structured outputs. See the [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

With a key configured, submitting a new application starts analysis in the background. The employer can read the saved explanation and ask follow-up questions. Older applications are queued when the employer first opens them. The prepared I02 example uses its curated sources. Analysis and chat share the submitted answer, CV and role context with OpenAI. Chat also sends the question and up to three recent exchanges. Use synthetic materials and questions only. Source reading, recruiter notes and other prototype flows work in the static build and without a key. Portable static builds do not contact the I02 endpoints. AI requests time out after 50 seconds in the browser. A failed analysis can be retried, and a failed chat keeps the question and note.

### Optional public Vercel AI

Portable builds remain offline by default. To enable hosted AI, deploy `api/i02` with the Vite application and set these server-side Vercel variables before rebuilding:

- `I02_HOSTED_AI=enabled` enables same-origin requests in the hosted frontend; it contains no credential.
- `I02_OPENAI_API_KEY` is a Secret used only by the server functions. `I02_OPENAI_MODEL` is optional.
- `I02_SITE_ORIGIN` is the exact HTTPS origin of the stable production URL. The deployment's own `VERCEL_URL` is also accepted for verification.
- `I02_RATE_LIMIT_READY=enabled` must be set only after verifying the active WAF request limit.

The hosted service is public and requires no additional code. Configure a Vercel WAF fixed-window rule matching only POST `/api/i02/chat` and `/api/i02/analysis`: 10 requests per 600 seconds, counted by IP, returning HTTP 429. Chat and analysis share the quota. Vercel tracks counters per region; users behind the same public IP share a bucket. The quota survives separate function instances but is not a global provider spending cap. GET availability probes do not consume it. On HTTP 429 the chat preserves the question and recruiter note and permits deliberate retry.

Keep credentials in server-only Vercel Secret variables, never `VITE_*`, frontend code or Git. Missing provider/quota configuration fails closed. The functions preserve the local adapter's source restrictions, validation and deadlines.

## Optional PostHog analytics

Set `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` in Vercel Production and rebuild. These are browser-visible ingestion configuration values, not a personal PostHog API key. Leaving either unset disables analytics without blocking local development or the portable build.

The application sends explicit workflow events and one pageview per hash-route pathname change. Query-only edits do not create pageviews. Record routes are grouped, and URLs omit search text and record identifiers. Browser identity stays anonymous; selected synthetic persona ID/role are event metadata, not shared person identities. No CV, answer, question, profile name or note text is sent. DOM autocapture, replay and exception/performance capture are disabled. The privacy page describes this optional transfer.

Local browser checks use a synthetic project token and intercept all PostHog traffic. Successful production ingestion responses show that the endpoint accepted events; they do not prove that a dashboard or funnel has been configured.

## Build and verify

```sh
npm run build
npm run preview
./scripts/verify
```

The static output is dist/. Browser checks require an already provisioned Playwright Chromium; starting the app never installs it. If Google Chrome is already installed, `PLAYWRIGHT_CHANNEL=chrome ./scripts/verify` runs the same gate with that channel. Browser checks cover portable static, local development and explicitly enabled hosted builds, with provider keys disabled and I02 responses mocked. See [participant guide](docs/PARTICIPANT_GUIDE.md), [architecture](docs/architecture.md), [current features](FEATURES.md) and [case protocol](docs/case/CASE_PROTOCOL.md).

The development tools use typescript-eslint8.73+ and a narrowly scoped npm override: @ts-morph/common0.27.0 uses minimatch11.0.9+ while shadcn4 still depends on ts-morph26. Keep this override until that parent adopts a patched minimatch range; recheck it when updating shadcn/ts-morph. Other minimatch versions are not globally overridden. Node24 meets the updated tool requirements.

To distribute a baseline participant package, run npm run package:participant -- /absolute/output/directory. This excludes Git history and instructor source material. Never distribute this repository’s history as a stage-safe packet.
