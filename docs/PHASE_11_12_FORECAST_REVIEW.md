# 30-day forecast engine

The application now includes a transparent first forecast baseline. After historical results are calculated, the user can choose **Estimate the next 30 days**. The worker reuses the historical financial engine and averages the last 30 daily values for each metric, then derives predicted operating profit and margin from the predicted value and cost.

The forecast is deliberately conservative:

- It produces exactly 30 future calendar days.
- It uses only the uploaded workbook and reviewed financial master.
- It assumes recent daily conditions continue.
- It does not invent missing selling prices or costs.
- It labels confidence from historical coverage and data readiness.
- It keeps assumptions and the prediction model visible inside an optional details panel.

This is the Phase 11/12 baseline. Phase 13 will add backtesting and error thresholds before more advanced ML models are considered.
