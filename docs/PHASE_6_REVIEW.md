# Phase 6 — Loss Attribution

Phase 6 adds a closed-by-default explanation panel to the historical results view. After the user chooses a date or date range, **Why did this period perform this way?** ranks the largest available operating-cost drivers and gives a short, plain-English next step.

The attribution is deliberately evidence-based:

- A negative operating profit is labelled as a loss.
- A positive operating profit is labelled as a profit.
- A zero result is labelled break-even.
- If profit is unavailable, the explanation is withheld instead of guessing.
- Drivers are limited to metrics with calculated values and are ranked by exact value.
- The main dashboard stays compact; explanations appear only after the user opens the panel.

Detailed operational cause classification (downtime reason, rejection pattern and product/machine contribution) will build on this financial driver layer in the next attribution increment.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` — 290 passed, 2 optional skipped
- `npm run build`
- `git diff --check`
