# 3D Profit Intelligence

**Factory Profit, Loss and Forecast Dashboard**

3D Profit Intelligence is a local-first web application that will translate MMS production workbooks into traceable operational financial performance for factory owners and business teams.

## Current checkpoint

Phase 3 adds a guided Financial Setup Wizard on top of the verified MMS importer. It collects product prices/material costs, machine and labour rates, overheads, quality/rework costs, scrap recovery, factory calendar rules, unit conversions and aliases. Effective-date and input checks are shared by the UI and Excel/JSON imports. Draft storage is local, optional and consent-based. Financial calculations remain deferred to their reviewed phase.

Phase 4 is merged. Phase 5 adds a local historical financial engine and compact date-range results workspace. Complete financial results require complete inputs; otherwise the application shows an explicit known subtotal or unavailable state. Calculations, source evidence and daily trends remain closed until requested.

Phase 3.1 adds an adaptive Data Review step: the workbook is processed first, and users see only missing or conflicting information that may affect results. They can review it or continue with clearly labelled partial results.

Phase 6 adds a closed-by-default loss/profit attribution panel. It ranks the largest calculated operating-cost drivers and gives a short action; unavailable profit is never explained with a guess.

Phase 7 adds a closed-by-default profit opportunities panel. It uses exact calculated cost drivers to suggest short, practical improvement actions without promising savings or inventing missing data.

The 30-day forecast baseline is now available after historical calculation. It uses the last 30 daily values, shows confidence and assumptions, and keeps any metric with missing source data unavailable.

Phase 8 adds unified, collapsed filters for date range, product, machine, shift and result status. The same data selection is used by historical calculations, explanations, trends and forecasts.

Phase 9 adds an owner-focused snapshot above the financial cards. It surfaces the period state, readiness and usable-record coverage without duplicating the metric values or opening detail panels automatically.

Phase 10 adds a collapsed Reports & exports panel for filtered historical CSV, forecast CSV, JSON report bundles and print-ready reports. Exports are generated locally and preserve statuses, assumptions and unavailable values.

Phase 13 adds an optional local 30-day rolling back-test for the forecast. It reports MAE, MAPE and a confidence level only when at least 60 days of workbook history are available.

## Financial integrity rules

- Actual accounting results, estimated operational results and opportunity losses remain separate.
- Missing mandatory amounts are never silently replaced with zero.
- Opportunity losses are not automatically deducted from operating profit.
- Every future amount must retain source evidence and its financial-policy version.
- Provisional formulas must remain configurable and visibly provisional.

## Local development

Requirements:

- Node.js 22 LTS (`>=22.13.0`)
- npm

Install and validate:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Start the local application:

```bash
npm run dev
```

## Data safety

Do not add client workbooks, normalized snapshots, generated reports, secrets or screenshots containing factory information to this repository. The relevant paths and spreadsheet extensions are excluded through `.gitignore`.

The importer does not upload or modify the selected workbook. It rejects unsupported formats, unsafe sizes, mismatched file signatures, missing structural requirements and imports with more than 25% invalid core rows.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Excel input guide](docs/EXCEL_INPUT_GUIDE.md)
- [Financial setup guide](docs/FINANCIAL_SETUP.md)
- [Phase 3 verification and review](docs/PHASE_3_REVIEW.md)
- [Phase 3.1 adaptive data review](docs/PHASE_3_1_REVIEW.md)
- [Phase 4 subphase plan and GitHub workflow](docs/PHASE_4_PLAN.md)
- [Phase 4.1 verification and review](docs/PHASE_4_1_REVIEW.md)
- [Formula definitions and execution boundaries](docs/FORMULA_REFERENCE.md)
- [Phase 4.2 verification and GitHub PR workflow](docs/PHASE_4_2_REVIEW.md)
- [Immutable releases and approval boundaries](docs/PHASE_4_3_REVIEW.md)
- [Confidence and policy workspace](docs/PHASE_4_4_REVIEW.md)
- [Archive portability and final verification](docs/PHASE_4_5_REVIEW.md)
- [Three-PR GitHub handoff](docs/PHASE_4_STACKED_PRS.md)
- [Phase 5 verification and review](docs/PHASE_5_REVIEW.md)
- [Phase 6 verification and review](docs/PHASE_6_REVIEW.md)
- [Phase 7 verification and review](docs/PHASE_7_REVIEW.md)
- [30-day forecast baseline](docs/PHASE_11_12_FORECAST_REVIEW.md)
- [Phase 8 unified filters](docs/PHASE_8_REVIEW.md)
- [Phase 9 owner dashboard](docs/PHASE_9_REVIEW.md)
- [Phase 10 reports and exports](docs/PHASE_10_REVIEW.md)
- [Phase 13 forecast validation](docs/PHASE_13_REVIEW.md)
- [Development workflow](docs/DEVELOPMENT.md)
- [Security and privacy](docs/SECURITY_AND_PRIVACY.md)
- [Decision status](docs/DECISION_STATUS.md)

## Project status

This repository is proprietary and has no public license. Do not publish, commit or push changes without explicit phase authorization.
