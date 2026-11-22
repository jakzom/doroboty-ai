# Orbital B.02 — host implementation

Read the [project guide](README.md), [host component APIs](HOST-COMPONENTS.md), [record APIs](RECORDS.md) and [verification checklist](VERIFICATION.md). The immutable HTML reference is a visual source; React owns the application.

## Composition and ownership

| Area              | Source anatomy                                                                                      | Host owner                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Public navigation | Wordmark, common links, outlined add-offer action, mobile rows                                      | prototype/shell.tsx, public/brand-mark.tsx                    |
| Entry/editorial   | Syne entry, animated homepage atlas, static methodology atlas                                       | prototype/home.tsx, methodology.tsx, OrbitalArt               |
| Listing           | Entry/atlas → search → category/location/mode → advanced → results                                  | prototype/marketplace.tsx, JobFilters, ResponsivePanel        |
| Reusable result   | Category strip, complete Inter title, company, location before mode, plain pay, save/detail actions | JobCard, CompanyLogo, SalaryFact                              |
| Offer             | Full identity/title/facts, reading, sticky terms/actions, employer, related results                 | JobPage; preserve copied HashRouter section URLs              |
| Forms/process     | Quiet surfaced panels, labels, validation, source review, human decisions, snapshots                | existing prototype feature controllers and Base UI primitives |
| Records           | One reading sheet, actual timeline, accessible Answer/CV tabs, retained draft notes                 | ApplicationRecord, RecordSheet, ProcessTimeline, CvAttachment |

Root tokens.css maps Orbital source roles into existing --gui-* consumers. globals.css loads local Syne/Inter; orbital.css owns shared composition, marketplace-*.css owns public geometry. Records/application CSS retains feature-specific reflow and states. Do not create a second controller or button system. Portals must receive the same tokens, focus and disabled states.

## Motion

OrbitalArt adapts the supplied inline SVG and elapsed-time controller: Build/Apply/Lead take 90/110/130 seconds. Both front and rear copies share positions. The homepage and listing pause on user request, reduced motion, hidden document, offscreen atlas or any open dialog. Resume retains elapsed phase and clamps frame deltas to 80ms. Category selection dims other routes. The methodology page uses the static SVG.

The existing success-only ConfettiBurst remains a host workflow extension: cleanup, duplicate guard and reduced-motion behavior are preserved. Motion never replaces textual feedback.

## Functional invariants

- Keep query/location drafts and applied URL filters distinct, with history/reset synchronization. Search stays outside the mobile advanced-filter dialog. Main facets remain visible. Preserve list/map, pagination, empty recovery and focus after chip removal.
- Use Base UI focus containment/restoration, named dialogs, labels, roving tabs and native constraints. Desktop advanced filters use a disclosure; mobile uses the existing full-height dialog.
- Keep category meanings separate from status, error and MatchScore. Disabled actions must remain disabled and readable; salary/tags remain facts.
- Preserve persona simulation, ownership projections, local drafts/submissions, CV snapshots, notes and allowed stage transitions. Candidate history must not expose recruiter notes. Never replace domain state with source-example jobs.
- Keep stage-1 async persistence, conflict recovery, dev-only provider boundary, timeout and cancellation behavior. Announce success after domain operations resolve.
- Do not insert fake preview/approval steps to mimic the reference's simpler flow. Existing human editing/approval, actual errors and retries govern behavior.

No visual migration establishes CI, publishing, production security or public-service availability. Record actual gate and browser evidence in the task.
