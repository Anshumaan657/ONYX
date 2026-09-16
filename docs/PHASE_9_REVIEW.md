# Phase 9 — Owner Dashboard

Phase 9 adds an owner-focused snapshot to the financial results workspace. Once a date or date range is calculated, the dashboard leads with a short decision message, readiness state and data coverage. The existing financial cards remain the single source for values and details, so metrics are not duplicated.

The owner snapshot distinguishes **Ready to decide**, **Review inputs** and **Inputs required**. It keeps explanations, cost drivers, filters and forecasts behind their existing controls, preserving a calm first view for a non-technical user.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` — 294 passed, 2 optional skipped
- `npm run build`
- `git diff --check`
