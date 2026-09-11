# Phase 5 — Historical revenue and cost engine review

## Delivered

- Date-range historical analysis runs in the existing local MMS worker; canonical production rows are not uploaded.
- Direct and approved-alias matching selects effective-dated product, machine, labour, quality, conversion and overhead records.
- Estimated Production Value uses good quantity and net selling price. It is not invoice revenue.
- Material, machine, labour, separate maintenance, incremental rework, overhead, packaging and transport costs remain distinct.
- Consolidated machine rates do not add a second maintenance charge. Itemized rates expose maintenance separately.
- Total Operating Cost, Estimated Operating Profit and Profit Margin are available only when their required inputs are complete.
- Partial results show a known subtotal. Missing information is never silently changed to zero.
- Exact rational arithmetic is retained through aggregation; Indian INR formatting is display-only.
- The results screen starts with compact cards. Explanations, formulas, source rows, missing inputs and daily trends open only after **View details**.
- Every range trend has a daily table. Single-value trends are suppressed.

## Generalized input behaviour

The engine first uses effective-dated financial-master records. Where a financial master does not supply a material, machine or labour rate, a corresponding MMS `Component Cost`, `Running Hrs Cost` or `Operator Per Hrs Cost` may provide an explicitly disclosed **estimated fallback**. The application does not treat MMS `Part Cost` as a selling price because its business meaning is not established.

Product prices, overheads and missing quality rules therefore remain unavailable until a reusable financial master supplies them. Users can import these values in bulk using the Phase 3 Excel template; they do not need to edit every production record.

## Financial boundaries

- Blank means unknown, not zero.
- Production value is not actual sales or audited revenue.
- Operating profit excludes opportunity losses, financing, depreciation and accounting COGS.
- Gross rejection attribution and scrap recovery remain separate from this operating-cost ledger to prevent double-counting. Incremental rework cost is included.
- Consolidated machine-rate maintenance can be described as included, but no separate maintenance amount is invented.
- Workbook fallback rates are estimates until their column meaning and effective dates are confirmed.
- Operator-hour workbook fallback uses recorded operating time as an activity-time estimate; it is not proof of payroll hours.
- Phase 5 does not provide causal loss attribution, recommendations or forecasts. Those belong to later phases.

## Review checklist

- Import a compatible MMS workbook and open **Financial results**.
- Select a date within workbook coverage and calculate.
- Confirm missing selling price produces an unavailable profit rather than zero.
- Import or restore a financial master, recalculate and inspect each cost component.
- Confirm only the selected card expands and its trend is hidden until requested.
- Confirm consolidated and itemized machine-rate cases do not duplicate maintenance.
- Compare selected synthetic or manually verified cases before treating provisional inputs as business-confirmed.

## Verification commands

Run on the supported Node 22 environment:

```bash
export PATH="/usr/local/bin:$PATH"
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Passing automated checks verifies the implementation contract. It does not confirm that a factory's workbook cost columns, prices or allocation rules are financially correct.
