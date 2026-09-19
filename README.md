# 3D Profit Intelligence

Local-first factory profit intelligence platform for turning MMS production workbooks into explainable operational financial performance, forecasts, and action recommendations.

## Overview

3D Profit Intelligence is designed for factory owners and operations teams that need to understand:

- actual production performance,
- cost drivers and profit/loss attribution,
- missing or conflicting input data,
- forecast quality and confidence,
- practical actions to improve margin.

The application works entirely on the client side by default, validates workbook inputs before calculation, and keeps calculation logic separated from UI concerns.

## What the product does

- Imports MMS Excel production workbooks with structural validation
- Reviews and completes financial setup inputs such as material costs, labor, machine rates, overheads, rework, and scrap
- Calculates historical operating results with source-backed evidence
- Explains the biggest cost and profit drivers without guessing at unavailable values
- Produces 30-day forecasts with confidence and validation metrics
- Surfaces action recommendations based on attributable opportunities and loss drivers
- Exports filtered reports in CSV and JSON formats, with print-ready output support
- Keeps the workflow local-first and privacy-conscious

## Core product flow

```text
Workbook import
  -> validation and canonical data normalization
  -> financial setup and policy review
  -> historical calculation
  -> attribution and opportunity analysis
  -> forecast generation and validation
  -> dashboards, exports, and recommendations
```

## Repository structure

```text
.
├── .github/workflows/        # CI automation
├── docs/                     # architecture, reviews, formulas, security guidance
├── src/
│   ├── app/                  # Next.js app routes and entry pages
│   ├── core/                 # domain logic, financial engines, policy logic
│   ├── features/             # user workflows and UI modules
│   ├── workers/              # browser workers for heavy computations
│   └── ...
├── .env.example              # environment template
├── AGENTS.md                 # repo-specific agent guidance
├── CLAUDE.md                # Claude-specific project notes
├── README.md                 # project overview
├── package.json              # scripts and dependencies
├── next.config.ts            # Next.js config
├── tsconfig.json             # TypeScript config
├── vitest.config.mts         # test config
├── vendor/                   # vendored XLSX package
├── .gitignore
├── .nvmrc
└── package-lock.json
```

## Key technical stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Vitest + Testing Library
- XLSX for workbook parsing
- Zod for validation
- Web Workers for heavy import and calculation work

## Data safety and operating model

This project is intentionally designed around local-first data handling:

- It processes workbooks in the browser without uploading them to a remote service.
- It rejects unsupported file structures, unsafe sizes, and malformed workbooks.
- It keeps raw source evidence and calculation traceability separate from summary value display.
- It distinguishes actual results, estimated results, opportunity losses, and unavailable metrics.
- It avoids silently replacing missing required data with zero values.

## Getting started

### Prerequisites

- Node.js 22 LTS (`>=22.13.0`)
- npm

### Install dependencies

```bash
npm ci
```

### Run the application locally

```bash
npm run dev
```

Then open the local development URL shown in the terminal.

### Validate the project

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Useful scripts

```bash
npm run dev          # start local app
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint checks
npm run typecheck    # TypeScript checks
npm test             # Vitest suite
npm run test:watch   # watch mode for tests
```

## Documentation

The repository includes detailed project documentation in the `docs/` directory:

- [Architecture](docs/ARCHITECTURE.md)
- [Development workflow](docs/DEVELOPMENT.md)
- [Excel input guide](docs/EXCEL_INPUT_GUIDE.md)
- [Financial setup guide](docs/FINANCIAL_SETUP.md)
- [Formula reference](docs/FORMULA_REFERENCE.md)
- [Security and privacy](docs/SECURITY_AND_PRIVACY.md)
- [Decision status](docs/DECISION_STATUS.md)
- Phase review documents for the implementation checkpoints and validation history

## Product status

This repository represents an active, staged implementation of a factory profit intelligence system. The work is structured in phased milestones and includes validation documentation for each major stage.

## Notes

- The project is proprietary and not currently published under an open-source license.
- Do not commit or push production data, customer workbooks, generated reports, screenshots, or secrets into this repository.
- Follow the repo documentation and the project owner’s approval process before publishing any phase or change.

## License

This repository does not currently include a public license declaration. Treat it as proprietary unless a different written authorization is provided by the repository owner.
