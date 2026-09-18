# Phase 13 — Forecast Validation Review

Phase 13 adds a transparent reliability check for the 30-day forecast. It uses a rolling back-test: the engine trains on the first 30 days of an available historical window, forecasts the next 30 days, and compares those estimates with the actual workbook results.

The check reports exact-precision mean absolute error (MAE), mean absolute percentage error (MAPE), the evaluated date ranges, and a confidence level. At least 60 calendar days of usable history are required. Fewer days are reported as **Unavailable** rather than guessed.

Validation runs locally through the existing import worker and respects the selected product and machine filters. It does not upload workbook data and does not claim to be machine learning; it measures how well the current transparent baseline performs on this workbook.

The dashboard keeps this information out of the initial summary. Users open the forecast details and choose **Run backtest** only when they want to inspect reliability.
