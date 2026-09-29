# Financial dashboard reconciliation

The dashboard uses validated production records (`includedInTotals`) as its default. Duplicate, invalid, and otherwise ineligible rows remain available as evidence in the reconciliation panel instead of silently changing the main number.

## Labour rates

`Operator Per Hrs Cost` is accepted as a strict hourly rate only when it is a single, non-negative value within the supported hourly-rate range. Values such as `115,115`, `115,115,115`, or `115115` are marked ambiguous and excluded from strict labour cost. Their first-rate and all-rates impacts are shown only in the opt-in reconciliation view.

Operating time is parsed as a duration and converted to decimal hours before costing. Missing or invalid durations and rates remain missing; they are never treated as zero.

## Cost labels

Component cost is calculated as `Qty × Component Cost` and is labelled as a material proxy when surfaced in workbook-only signals. It is not added a second time as a separate material cost. Machine cost is `Opr. Time hours × Running Hrs Cost`.

Downtime remains an operational duration. It is not described as lost revenue, and quality fields remain partial unless an approved rupee proxy exists.

## Reconciliation evidence

The details panel reports rows read, included, excluded, duplicate and invalid exclusions, missing cost fields, ambiguous labour-rate rows, and detected workbook summary rows. It compares only additive quantities and normalized durations with Excel totals. Each field is labelled `Comparable`, `Partial source values`, `Missing Excel total`, `Not comparable`, or `ONYX-calculated`.

Rate and per-unit columns are never summed as totals. Financial fields are marked `ONYX-calculated` and show their row-level formula instead. Historical metric cards keep formulas and evidence behind their opt-in “View details” control.
