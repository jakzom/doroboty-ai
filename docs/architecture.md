# Architecture

One React/TypeScript application is built by Vite into static files. HashRouter renders routes under /#/; route parameters created in the browser require no hosting rewrites. New and changed UI follows the accepted Orbital B.02 [design system](design-system/README.md), adapted into the existing stack. Scenario data stays in the browser.

## Data flow

JSON marketplace/person fixtures → initialState → PrototypeProvider → feature views. Local operations go through transition with shared Zod schemas and explicit role/ownership/transition checks for coherent simulation. All roles still have access to the same browser data; these checks are not security.

Candidate source notes, generated draft and approved application are distinct fields. Submission snapshots CV, candidate name, job title, scenario score and summary. Employer stage events are appended, with private-in-the-UI notes. Profile/job edits do not rewrite submitted records.

Storage uses the browser-local IndexedDB database `doroboty.prototype`, store `scenarios`, key `doroboty.prototype.v1`. The stored value is the unchanged version1 JSON string. Startup completes its asynchronous load before rendering routes or starting analysis. A readwrite transaction atomically compares the last observed raw value and replaces it. Overlapping transactions on this store serialize across tabs; success waits for transaction completion, with strict durability requested. A conflict preserves the losing edit in memory for export and blocks all further writes until reload, including import/reset/background analysis. Non-conflict transaction failures switch the tab to memory-only mode to avoid a blind retry after an uncertain commit. Form success messages require durable completion.

The first successful load migrates an existing localStorage version1 raw value in a transaction, including a corrupt string retained for explicit download/recovery. Cleanup removes only the unchanged legacy value and only after commit; failure leaves that copy intact. If legacy storage cannot be read, startup blocks automatic replacement until confirmed import/reset. Once IndexedDB has a record, it is authoritative; old-runtime writes to localStorage are not synchronized. Close old tabs before updating. Export/import remains the recovery path for reverting to a previous localStorage runtime. This migration does not change domain schema, snapshots or the historical case packet.

Import validates schema/version, IDs, references and stage history. Unreadable saves are protected against automatic overwrite; settings can download the raw original and explicitly import/reset. Import/export is capped at2MB, without binary CV storage. Open/transaction waits have10-second deadlines. Unavailable IndexedDB or write/quota failure preserves memory state and gives export guidance; a failed/aborted transaction never announces durable success. Clearing site data or browser eviction can remove local work; exported files are the external backup.

## Features

src/features/prototype owns model/storage/state and page compositions. src/features/jobs retains reusable presentation/filter/description logic; src/components/ui owns Base UI controls. Keep changes small.

IndexedDB is origin-specific. Reload preserves state; another browser/device/port starts separately. No cross-tab live synchronization is provided; close other tabs before editing/importing. Hash links reference records in the receiving browser, not transferred records.

The application review uses a separate note keyed by application and active recruiter. Notes inherit scenario export/import/reset and leave recruiting events untouched. The local development middleware handles `/api/i02/chat` and `/api/i02/analysis`. It validates the selected application’s submitted answer, CV and role context or uses the bundled materials for the prepared I02 chat. Both flows call OpenAI Responses without storing a retrievable response and accept citations only to sources supplied in the request. The prototype provider processes one pending analysis at a time, survives route changes and resumes pending work from local storage. Results are attached to applications with their role context. A scenario reset or import cancels in-flight work. Chat retains conversation in page memory. Static builds keep source reading, review questions and recruiter notes. Their client returns unavailability without making any I02 request, including availability probes and previously persisted pending analyses. The shared development client bounds both response headers and body reading at 50 seconds, while provider generation has a server-side 45-second deadline. A timeout records analysis failure and releases the queue for the next application. Chat keeps the question and recruiter note available for a deliberate retry.

## Evidence and distribution

The baseline historical CSV and JSON are separate from interactive state. Future evidence must arrive in a separately reviewed package. package:participant copies only explicit allowed files/directories, including the complete docs/design-system guide/kit, and omits docs/source, historical task notes, agent run history and .git. A packet verifier checks the baseline data; packaging also verifies a pristine file/hash manifest. Ordinary checks permit participants to edit code and generate build/test output without invalidating a distribution fingerprint. Instructor repository history is never participant-safe.

## Checks

npm run check and ./scripts/verify run formatting, design-system reference integrity/example checks, lint, types, unit tests, build and Playwright against the static preview and a separate local development server. Development tests disable the provider key and mock provider endpoints. An optional PLAYWRIGHT_CHANNEL selects an already installed browser channel. Playwright checks external requests, complete workflows, error/recovery behavior, keyboard controls and mobile layout. No test starts system services. npm run dev only starts Vite.
