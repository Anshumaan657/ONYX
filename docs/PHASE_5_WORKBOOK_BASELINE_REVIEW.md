# Phase 5 — Workbook-only 30-day baseline

Phase 5 adds an operational outlook that works even when financial setup is incomplete.

## Delivered

- Projects reported, accepted, rejected and reworked quantities for the next 30 days
- Projects downtime hours when daily downtime evidence exists
- Uses the latest available 30 workbook days (`recent-daily-average-v1`)
- Shows history length and low/medium/high/unavailable confidence
- Shows all assumptions in a collapsed details view
- Keeps unavailable metrics unavailable instead of treating them as zero
- Separates the workbook baseline from the financial-master forecast

This is a transparent baseline, not an ML model, accounting forecast or guarantee of future performance.

## Verification

```text
npm run lint
npm run typecheck
npm test
npx next build --webpack
```

The baseline has unit tests for projection dates, averaging and missing values.
