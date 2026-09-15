# Phase 3.1 — Adaptive Data Review

The workflow now keeps the full financial master editor available without forcing it into the primary path. After a workbook is processed, the workspace opens a compact Data Review step. It summarizes workbook readiness, data-quality findings and financial-master gaps, then lets the user either review/fix inputs or continue to the date selector and available results.

Unknown values are never silently converted to zero. Skipping a review leaves the affected metric marked partial or unavailable by the historical engine. The original workbook remains local and unchanged.

## User flow

```text
Upload workbook → Automatic processing → Data Review (only when useful)
→ Choose dates → Financial summary → Optional details
```

The review is intentionally not a long questionnaire. It is a decision point with two actions: **Review and fix items** or **Continue with available results**. The existing Financial Setup editor remains available for bulk rates, mappings, effective dates and import/export.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` — 287 passed, 2 optional skipped
- `npm run build`
- `git diff --check`
