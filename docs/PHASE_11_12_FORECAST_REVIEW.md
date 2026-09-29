# 30-day forecast engine

The application now includes a validated segmented forecast. After historical results are calculated, the user can choose **Estimate the next 30 days**. The worker uses only included, valid workbook rows and preserves machine, product and shift identity. It prefers machine + product + shift groups, then falls back to machine + product, machine, product and finally the workbook aggregate when a group has fewer than seven usable history days.

The forecast is deliberately conservative:

- It produces exactly 30 future calendar days and returns both 30-day totals and daily averages.
- It gives the latest seven active days 50% weight, the previous 23 active days 30% weight and older matching-weekday history 20% weight.
- It respects weekday activity patterns and predicts zero activity for a weekday with no reliable history rather than assuming full production every day.
- It forecasts component, machine and strict labour cost signals separately, and forecasts downtime separately with the historical unreported-downtime share.
- It excludes extreme baseline dates from the forecast while retaining them in source history.
- It does not invent missing selling prices or costs; profit and margin remain unavailable when complete revenue or cost evidence is absent.
- It assigns confidence only after the validated method is backtested; insufficient history remains unavailable.
- It keeps source exclusions, segment fallback, outlier dates, assumptions and the prediction model visible inside the details panel.

This is the Phase 11/12 validated statistical engine. Phase 13 backtesting now scores the same segmented method and excludes partial or unavailable daily values from the error calculation. More advanced ML models remain optional future work after this baseline is measured on real factory history.
