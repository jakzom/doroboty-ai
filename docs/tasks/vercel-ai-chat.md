# Hosted application AI

## Intent

Make the existing application chat available in the deployed Vercel recruiter panel. The published static build deliberately disables the optional development endpoints; deployment currently has no AI functions or provider configuration.

## Acceptance criteria

- Reuse the existing source-grounded OpenAI adapter and shared Zod contracts for hosted chat and analysis. Preserve Polish UI, application/persona isolation, human decisions, timeouts and deliberate retries.
- Keep the provider key server-only and exclude credentials from source, build output, logs and participant packages.
- Add Node.js Vercel Functions with bounded input, method/origin checks, useful failure states and access/cost controls matching the user's chosen audience.
- Keep portable static builds network-free by default and local development compatible. Enable hosted API requests explicitly for the Vercel build.
- Update FEATURES.md and relevant setup/architecture documentation in the same change. Preserve baseline-only participant distribution.
- Run `./scripts/verify` with Node.js 24 and provisioned Chrome, review the patch separately, deploy and verify a real synthetic chat exchange on Vercel without logging question or response text.

## Constraints and initial evidence

Preserve the pre-existing working tree. Use the clean dependency installation in a disposable temporary copy because several original node_modules files are iCloud dataless placeholders. Current production project: `doroboty-ai-case`, `prj_Wo0l79xmpsNmELM1boI8NyinUFxW`, team `team_9iLNneFwMvcC9s1nOAwoDPzO`. A metadata-only check found no Vercel environment variables. A presence-only local check found a configured provider key; its value was not displayed.

The user selected public AI for everyone with the link, with request limits and no access code. The implementation uses Vercel WAF for a shared chat/analysis quota of 10 POST requests per 600-second fixed window per IP per Vercel region. This is not a global provider spending cap. The discarded access-code draft was replaced before publication. Persona selection does not authenticate callers.

## Verification and review

- The public variant passed the original complete gate: 43 unit tests and 62 browser journeys with provider keys disabled and provider responses mocked.
- Separate source review confirmed that provider generation/parsing was moved without changing its implementation. The React change preserves the existing controls and adds explicit HTTP 429 recovery without clearing the question. No scenario schema or stored records changed.
- Preview `dpl_2jSPUYa4W74T6sBZ7GJyrP9yb8Mn` built successfully but its authenticated API probe exposed `ERR_MODULE_NOT_FOUND`: Vite/Vitest resolution had masked Node ESM's requirement for explicit `.js` imports. Fixed the server dependency chain and added `verify:hosted` to compile and execute both endpoints under actual Node ESM without provider requests. Repeat the full gate for this correction.
- The preview quota probe encountered Vercel Authentication (401), so it did not establish rate enforcement. A temporary 2-request/10-second rule was then checked against the existing public deployment's dormant API paths, before any paid provider was enabled: combined chat/analysis statuses were 404, 404, 429. The final active rule is `rule_i02_ai_request_limit_zs4MQ3`, limited to the two exact AI POST paths, 10 requests/600 seconds by IP. Site pages and GET availability checks are excluded.
- Non-secret production environment configuration was set for hosted API enablement, the stable site origin and verified quota readiness. Provider credentials were not printed or uploaded. Automatic approval review rejected reading/emitting the local API key through REPL; the user was asked to configure the Secret directly in Vercel. An explicit temporary preview share-link request was also rejected; subsequent diagnosis used the existing authenticated connector.

## Durable lesson

For standalone Vercel Node ESM functions, verify the emitted module graph with Node as well as TypeScript/Vite. Every relative runtime import in the server dependency chain needs its emitted extension; frontend resolver success is insufficient evidence of function startup.

Final corrected deployment and a real synthetic provider exchange remain pending.
