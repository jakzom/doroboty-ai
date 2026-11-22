# Prototype data boundary

This static frontend has no trusted server or real authentication. Role-specific UI and local transition checks organize the scenario; anyone using the browser can inspect all stored data. Use synthetic data only.

No API keys, credentials, real CVs or private material belong in frontend source, JSON, localStorage or exports. Exports include private-in-the-UI source/recruiter notes.

Static builds make no I02 availability, analysis or chat requests. The optional analysis and chat read their key on the local development server. The loopback endpoints accept same-origin requests. Configured analysis shares the submitted answer, CV and role context of the new application with OpenAI. Older records are analyzed on first employer review. Sending a question shares those materials, the question and recent exchanges. The prepared I02 example uses its bundled sources. Recruiter notes and unrelated applications stay in the browser. Persona selection is not authentication for a hosted or shared-key service.

Render imported text through React text nodes, validate imports with shared Zod schemas, reject unsupported versions, duplicate IDs, broken references and oversized files. Never overwrite an unreadable save automatically.
