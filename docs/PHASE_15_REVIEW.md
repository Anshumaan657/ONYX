# Phase 15 — Final Product Verification

Phase 15 is the release-readiness pass for the complete local-first workflow. It does not add a new financial formula or silently change an approved policy.

## Verified user flow

1. Upload a supported MMS workbook.
2. Process it locally in the worker.
3. Review only missing or conflicting information.
4. Choose a date or date range and optional product, machine, shift and status filters.
5. Calculate the clean financial summary.
6. Open metric details, explanations, trends and source evidence only when needed.
7. Request the 30-day estimate and optionally run its 30-day back-test.
8. Open the period action plan to see evidence-based maximize-profit, minimize-loss or missing-input guidance.
9. Export the selected report locally.

## Release checks

- Complete, partial and unavailable financial results remain visibly distinct.
- Missing values are never replaced with zero or an invented explanation.
- Forecast assumptions, validation confidence and recommendation evidence stay visible inside closed detail panels.
- Buttons have accessible labels and keyboard-sized targets; details, errors and status messages remain usable without hover.
- Client workbooks, generated reports and local storage data remain excluded from Git.
- The production build, lint, typecheck, tests and dependency audit must pass before merge.

The final deployment and handover work is tracked separately in Phase 16.
