import json

with open("widgets.json", "r", encoding="utf-8") as f:
    w = json.load(f)

# Add runButton: true to all heavy endpoints that currently auto-load
heavy_widgets = [
    # Tab 1 - slow scanners
    "spread_drift_alerts", "technical_alerts", "corporate_actions_calendar",
    # Tab 2 - all factor widgets need heavy computation
    "factor_bar", "factor_drift",
    # Tab 3 - all attribution is heavy
    "attribution_waterfall", "rolling_attribution", "attribution_summary",
    # Tab 4 - all performance is heavy
    "subsector_perf_bar", "intra_subsector_dispersion",
    # Tab 5 - all pairs lab is heavy
    "cointegration_results", "spread_chart", "hedge_ratio_chart",
    "pair_metrics", "technical_confirmation",
    # Tab 6 - dividend/split scanners
    "dividend_calendar", "split_history",
]

count = 0
for wid in heavy_widgets:
    if wid in w and not w[wid].get("runButton"):
        w[wid]["runButton"] = True
        count += 1

with open("widgets.json", "w", encoding="utf-8") as f:
    json.dump(w, f, indent=2, ensure_ascii=False)

print(f"Added runButton to {count} additional widgets.")
print(f"Total widgets with runButton: {sum(1 for k in w if w[k].get('runButton'))}")
