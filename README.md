# Onyx

Onyx is a local-first factory profit intelligence platform. It turns MMS production workbooks into explainable operational financial results, forecasts and practical actions.

## What Onyx does

Onyx helps factory teams move from raw production records to a clear financial view:

1. Upload an MMS `.xls` or `.xlsx` workbook.
2. Process and validate the workbook locally in the browser.
3. Review only missing, invalid or conflicting information.
4. Select a date, date range, product, machine, shift or result status.
5. View a clean financial summary.
6. Open explanations, evidence, formulas, trends and actions only when needed.
7. Generate a transparent 30-day baseline forecast and optionally backtest it.
8. Export historical and forecast reports locally.

## Financial outputs

Depending on the available source data and financial setup, Onyx can calculate:

- Estimated production value
- Material cost
- Machine cost
- Labour cost
- Maintenance cost
- Quality and rework cost
- Allocated overhead
- Packaging and transport cost
- Total operating cost
- Estimated operating profit
- Profit margin

Every result is labelled as complete, partial or unavailable. Missing information is never silently treated as zero.

## Forecasting

The current forecast is a transparent statistical baseline, not an ML model. It is called `recent-daily-average-v1` and uses up to the most recent 30 daily values in the selected historical report. Those averages are projected across the next 30 calendar days.

The forecast clearly displays its assumptions and confidence. It does not invent future prices, costs, staffing, demand or shutdowns.

An optional 30-day backtest is available when at least 60 calendar days are available:

- 30 days are used for training
- The following 30 days are used for evaluation
- MAE and MAPE are reported per financial metric
- Confidence is high at MAPE ≤ 10%, medium at MAPE ≤ 25%, and low above 25%

Accuracy must be measured against the specific factory workbook. The baseline does not guarantee future financial performance.

## Data safety

Onyx is local-first by default:

- Workbooks are processed in the browser.
- Raw workbooks are not uploaded by the application.
- Source rows and calculation evidence remain traceable.
- Missing or conflicting inputs are surfaced instead of hidden.
- Local draft and policy storage require user consent.
- Do not commit workbooks, generated reports, screenshots containing factory data or secrets.

## Technology

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vitest and Testing Library
- XLSX workbook parsing
- Zod validation
- Web Workers for heavier import and calculation work

## Local development

Requirements:

- Node.js 22 LTS (`>=22.13.0`)
- npm

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Run the verification suite:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

When the local environment prevents Turbopack from binding its internal process, the production build can be verified with:

```bash
npx next build --webpack
```

## Repository structure

```text
.
├── docs/                    # Architecture, security and phase reviews
├── src/
│   ├── app/                 # Next.js entry points and global styles
│   ├── core/                # Import, financial, policy, forecast and report logic
│   ├── features/            # User-facing workflow and dashboard components
│   └── workers/             # Browser workers for import and analysis
├── vendor/                  # Vendored XLSX package
├── LICENSE
├── package.json
├── next.config.ts
└── vitest.config.mts
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development workflow](docs/DEVELOPMENT.md)
- [Excel input guide](docs/EXCEL_INPUT_GUIDE.md)
- [Financial setup guide](docs/FINANCIAL_SETUP.md)
- [Formula reference](docs/FORMULA_REFERENCE.md)
- [Security and privacy](docs/SECURITY_AND_PRIVACY.md)
- [Decision status](docs/DECISION_STATUS.md)
- [Phase 3 review](docs/PHASE_3_REVIEW.md)
- [Adaptive data review](docs/PHASE_3_1_REVIEW.md)
- [Phase 4 plan](docs/PHASE_4_PLAN.md)
- [Phase 4.1 review](docs/PHASE_4_1_REVIEW.md)
- [Phase 4.2 review](docs/PHASE_4_2_REVIEW.md)
- [Phase 4.3 review](docs/PHASE_4_3_REVIEW.md)
- [Phase 4.4 review](docs/PHASE_4_4_REVIEW.md)
- [Phase 4.5 review](docs/PHASE_4_5_REVIEW.md)
- [Phase 4 stacked PR workflow](docs/PHASE_4_STACKED_PRS.md)
- [Phase 5 review](docs/PHASE_5_REVIEW.md)
- [Phase 6 review](docs/PHASE_6_REVIEW.md)
- [Phase 7 review](docs/PHASE_7_REVIEW.md)
- [Forecast baseline](docs/PHASE_11_12_FORECAST_REVIEW.md)
- [Phase 8 review](docs/PHASE_8_REVIEW.md)
- [Phase 9 review](docs/PHASE_9_REVIEW.md)
- [Phase 10 review](docs/PHASE_10_REVIEW.md)
- [Phase 13 review](docs/PHASE_13_REVIEW.md)
- [Phase 14 review](docs/PHASE_14_REVIEW.md)
- [Phase 15 review](docs/PHASE_15_REVIEW.md)

## Project status

Onyx is an actively developed, phased implementation. Financial calculations, source evidence, policy versions, forecast assumptions and unavailable states are intentionally kept visible so results can be reviewed before operational use.

## License

Onyx is released under the [MIT License](LICENSE).
