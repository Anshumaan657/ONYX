# Phase 14 — Evidence-Based Action Recommendations

Phase 14 adds a recommendation layer after the user opens the period explanation. The initial dashboard remains unchanged and closed-by-default.

The action plan has three safe outcomes:

- **Maximize the profit** when the selected period is profitable.
- **Minimize the loss** when the selected period is loss-making.
- **Review the missing inputs** when a complete result is unavailable.

Recommendations are generated only from calculated workbook metrics and their statuses. Each recommendation includes a short action, a simple reason, supporting evidence and a confidence label. The engine does not promise savings, invent causes, or turn opportunity ideas into accounting results.

Partial and unavailable reports remain clearly labelled. A partial report receives lower confidence; an unavailable report receives no financial recommendation and points the user back to the missing inputs.
