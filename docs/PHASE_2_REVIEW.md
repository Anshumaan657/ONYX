# Phase 2 — Workbook-only operating metrics

Phase 2 adds a separate operational signal layer built only from values present in the imported MMS workbook. It does not call these values accounting profit and does not invent missing costs.

## Delivered

- Reported and accepted production quantities
- Rejected, reworked, error-stroke and production-loss quantities
- Operative, setup, downtime and system-off hours
- Workbook component, machine and labour cost fields when present
- Cost per reported unit when all workbook cost components are complete
- Product, machine and shift filtering through the existing results controls
- Partial and unavailable statuses for missing workbook fields
- Source-row-aware worker calculation with data-quality warnings retained

Financial-master calculations, approved policies and the 30-day forecast remain separate. The workbook-only layer is a transparent operational proxy and must not be described as true accounting profit.

## Verification

```text
npm run lint
npm run typecheck
npm test
npx next build --webpack
```

The workbook metrics include unit tests for aggregation, missing values and filters.
