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
