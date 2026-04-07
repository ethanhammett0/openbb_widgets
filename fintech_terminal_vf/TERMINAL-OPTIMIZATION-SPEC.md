# Terminal Optimization Spec v2

## Problem Statement

The terminal has 44 widgets across 7 tabs. It's cluttered, not parsimonious, and critical analytical workflows are missing. Specific issues:

1. **Too many point-in-time tables, not enough time series.** RSI, MACD, SMA data exists in `data_providers.py` but only feeds a flat alert table (`technical_alerts`). No RSI chart, no MACD chart, no price + overlay chart. Factor drift is the only true time series chart on the analytical side.

2. **Redundant widgets.** `subsector_factor_exposure` and `factor_heatmap` show nearly the same data in different formats. `subsector_attribution` and `attribution_summary` overlap heavily. `dividend_calendar` on Morning Pulse duplicates `dividend_calendar` on Corporate Actions tab. `rolling_momentum` is just a worse version of `subsector_perf_heatmap`.

9. **Color values rendered as raw hex strings.** Screenshot shows `#F59E0B`, `#FF3B30`, `#E2E8F0` as literal text in a "Color" column instead of being applied to the cells. The backend returns a `color` field but there are no `columnsDefs` in `widgets.json` telling AgGrid how to render it. Without column definitions, AgGrid just shows every field as a raw text column.

10. **"Flag" column is meaningless without context.** Emoji flags like 🔴, 🟡, 💰, ✂️ provide no explanation. A red dot next to TLT at -100% return doesn't tell you *why* it's flagged. Flags should either be replaced with `hoverCard` tooltips that explain the condition, or removed entirely in favor of `columnColor` rules that color the relevant data cell directly.

11. **No column definitions = no AgGrid intelligence.** Zero widgets in the current `widgets.json` use `columnsDefs`. This means no `greenRed` color rendering, no `formatterFn` for numbers/percentages, no pinned ticker columns, no sparklines, no `cellOnClick` for drill-down, no hidden utility columns. Every table is rendered as raw auto-detected columns.

12. **SEC filings are link-only.** The terminal returns filing URLs but has no inline viewer. OpenBB supports `multi_file_viewer` widget type that can render PDFs/documents directly in the workspace. SEC EDGAR filing URLs can be passed directly to this widget type.

3. **SEC tab is a vertical scroll nightmare.** 12 widgets stacked to y=105. Most users need 3-4 of these, not 12.

4. **Pairs Lab has no price chart.** You can see the spread and hedge ratio, but never the actual normalized price series of the two legs — the most basic pairs visual.

5. **Morning Pulse has no actual price chart.** It's all tables. A research terminal's morning view should have a price chart front and center.

6. **Corporate Actions is filler.** `universe_reference` is a static data table. `ipo_monitor` rarely has relevant data. `split_history` is rarely actionable.

7. **Data/logic bugs from prior session.** `routes_corporate.py` still uses `days_ahead` params but `widgets.json` was rewritten to use `start_date`/`end_date` — mismatch. The `sec_filing_viewer` widget was defined in `widgets.json` but the route may have issues with HTML fetching at scale.

8. **Multi-select is severely underused.** Only `macro_inputs` instruments has multi-select. Every sub-sector filter, every factor filter, every form type filter should be multi-select. Single-select forces "All or exactly one" which is never how an analyst works — you want "Payment Networks + Digital Payments" or "10-K + 10-Q" simultaneously.

---

## Design Principles

- **Fewer, richer widgets.** Target ~31 widgets (down from 44). Each widget should earn its screen space.
- **Time series first.** Every analytical concept should have a chart showing it over time, not just a current-value table.
- **Click-to-drill.** Tables with tickers should drive charts via parameter groups. Click a row → charts update.
- **Multi-select everywhere.** Any filter that represents a finite set (sub-sectors, factors, form types, event types, symbols) should be multi-select via `endpoint` type with `multiSelect: true`. Single-select dropdowns are only for mutually exclusive choices (beta mode, chart type).
- **Tabs map to analyst workflows**, not data source categories.

---

## Proposed Tab Structure (5 tabs, down from 7)

### Tab 1: Morning Pulse (6 widgets)

The analyst's daily open. Market context + what moved + what's alerting.

| Widget | Type | Size | What it does |
|--------|------|------|-------------|
| `macro_returns` | table | 40×5 | Multi-instrument returns monitor (existing, works well). Keep as-is. |
| `universe_movers` | table | 20×14 | Universe snapshot sorted by abs(% change). Clickable tickers → drive `stock_chart`. |
| `stock_chart` | chart | 20×14 | **NEW.** Plotly candlestick/line chart for selected ticker. Params: symbol (grouped), period. Uses `get_aggregates()`. Shows price + volume subplot. |
| `gainers_losers` | table | 20×12 | Top N gainers/losers. Keep. |
| `technical_alerts` | table | 20×12 | RSI/MACD/SMA cross alerts. Keep. Clickable tickers → drive `stock_chart`. |
| `corporate_actions_calendar` | table | 40×8 | Upcoming dividends/splits/earnings in one view. Fix the param mismatch. |

**Key changes:** Added `stock_chart` driven by clicking any ticker. Removed `spread_drift_alerts` (moved to Pairs Lab where it belongs). Reduced `corporate_actions_calendar` height.

**Interaction:** `universe_movers` and `technical_alerts` rows are clickable via `cellOnClick` → update `stock_chart` symbol via Group 1.

---

### Tab 2: Factor & Attribution (8 widgets)

Merged Factor Monitor + Return Attribution into one tab. These are the same analytical workflow — you look at factor exposures, then ask "how much did each factor contribute to returns?"

| Widget | Type | Size | What it does |
|--------|------|------|-------------|
| `factor_heatmap` | chart | 40×16 | Heatmap of ticker × factor betas. Keep. |
| `factor_bar` | chart | 20×14 | Single stock factor betas bar chart. Grouped to symbol. |
| `factor_drift` | chart | 20×14 | Time series of a single factor beta over time. Grouped to symbol. |
| `attribution_waterfall` | chart | 20×14 | Factor contribution waterfall for selected stock. Grouped to symbol. |
| `rolling_attribution` | chart | 20×14 | Stacked area of daily factor contributions over time. Grouped to symbol. |
| `factor_zscore_alerts` | table | 40×10 | Tickers with factor betas deviating from mean. Clickable → drive all charts. |
| `attribution_summary` | table | 40×10 | Per-ticker total return, factor-explained, idiosyncratic, R². Clickable → drive charts. |
| `attribution_scatter` | chart | 40×14 | Factor-explained vs total return scatter. Keep. |

**Key changes:** Merged two tabs into one. Removed `subsector_factor_exposure` (redundant with heatmap). Removed `subsector_attribution` (redundant with `attribution_summary`). Click any ticker in the alert/summary tables → all 4 single-stock charts update.

---

### Tab 3: Group Performance (4 widgets)

Sub-sector level analysis. Should be tight and scannable.

| Widget | Type | Size | What it does |
|--------|------|------|-------------|
| `subsector_perf_heatmap` | chart | 40×14 | Multi-horizon heatmap (1D/1W/1M/3M/6M). Keep. |
| `subsector_perf_bar` | chart | 20×14 | Bar chart of sub-sector returns for a single period. Keep. |
| `intra_subsector_dispersion` | table | 20×14 | Best/worst/EW/dispersion per sub-sector. Keep. |
| `universe_scatter` | chart | 40×14 | Short-term vs long-term return scatter. Keep. |

**Key changes:** Removed `rolling_momentum` (redundant with heatmap which already shows 1M/3M/6M). 5 widgets → 4.

---

### Tab 4: Pairs Lab (7 widgets)

Pairs trading analytical workbench. The missing piece was a normalized price chart.

| Widget | Type | Size | What it does |
|--------|------|------|-------------|
| `pair_metrics` | metric | 40×5 | KPI tiles: spread, z-score, hedge ratio, half-life, correlation. Keep. |
| `cointegration_results` | table | 40×12 | Cointegration test results for all pairs. Clickable → drive charts. |
| `normalized_price_chart` | chart | 20×14 | **NEW.** Normalized (rebased to 100) price series for both legs overlaid. Essential for visual pair assessment. |
| `spread_chart` | chart | 20×14 | Spread time series with Bollinger bands. Keep. |
| `hedge_ratio_chart` | chart | 20×14 | Kalman vs Rolling OLS hedge ratio over time. Keep. |
| `rsi_divergence_chart` | chart | 20×14 | **NEW.** RSI(14) time series for both legs overlaid, with 30/70 bands. Shows divergence visually instead of a table flag. Replaces `technical_confirmation` table. |
| `spread_drift_alerts` | table | 40×8 | Pairs with z-score exceeding threshold. Moved from Morning Pulse. |

**Key changes:** Added `normalized_price_chart` and `rsi_divergence_chart`. Removed `technical_confirmation` (replaced by the RSI chart which is far more informative). Removed `covariance_heatmap` (niche, rarely actionable in a pairs context — correlation is already in `pair_metrics`). Moved `spread_drift_alerts` here.

---

### Tab 5: SEC & Fundamentals (6 widgets)

Trimmed from 12 to 6. Focused on what an equity analyst actually uses daily.

| Widget | Type | Size | What it does |
|--------|------|------|-------------|
| `sec_filing_metrics` | metric | 40×5 | Company overview KPIs (CIK, latest 10-K/10-Q dates, SIC). Keep. |
| `sec_filing_viewer` | multi_file_viewer | 40×24 | **REDESIGNED.** Inline document viewer using OpenBB's native `multi_file_viewer` widget. Cascading dropdown: select symbol → see its filings → select filing(s) → rendered inline. Replaces the broken markdown viewer. |
| `sec_financial_snapshot` | table | 40×14 | XBRL financial summary (revenue, NI, assets, etc). Keep. |
| `sec_xbrl_chart` | chart | 20×14 | Bar chart of any XBRL concept over time. Keep. |
| `sec_company_filings` | table | 20×14 | Recent filing history for selected company. Keep. With `cellOnClick` on filing rows to drive the viewer. |
| `sec_8k_filings` | table | 20×12 | Recent 8-K material events. Keep. |
| `sec_insider_transactions` | table | 20×12 | Form 3/4/5 insider filings. Keep. |

**Key changes:** `sec_filing_viewer` redesigned as `multi_file_viewer` type with cascading symbol→filing dropdown and inline rendering. Removed `sec_filing_search` (full-text EDGAR search is slow and rarely used — analysts go to EDGAR directly for that). Removed `sec_filing_timeline` (filing activity histogram is not actionable). Removed `sec_universe_filings` (scanning all tickers is slow and the results are sparse). Removed `sec_13f_holders` (full-text search for 13F mentions is unreliable). Removed `sec_proxy_filings` (niche). Absorbed `dividend_calendar`, `split_history`, `ipo_monitor`, `universe_reference` from the old Corporate Actions tab — **these are cut entirely** (dividends/splits are already on Morning Pulse's corporate actions calendar; IPO data is sparse; universe reference is static lookup).

---

## AgGrid Column Architecture Overhaul

The single biggest quality improvement. Every table widget gets explicit `columnsDefs` in `widgets.json` under `data.table.columnsDefs`. This enables proper rendering, formatting, interactivity, and eliminates the raw hex color strings and contextless flags.

### Color Rendering Fix

**Problem:** Backend returns `{"color": "#FF3B30", "pct_change": "-2.5%"}`. AgGrid renders `color` as a visible text column showing hex codes.

**Solution:** Two approaches, used together:

**Approach A — `greenRed` renderFn on numeric columns (preferred for % changes):**
The `pct_change` column itself gets colored. No separate `color` field needed. Backend returns raw numeric values; AgGrid handles the coloring.

```json
{
  "field": "pct_change",
  "headerName": "% Change",
  "cellDataType": "number",
  "formatterFn": "percent",
  "renderFn": "greenRed"
}
```

**Approach B — `columnColor` with `colorRules` (for threshold-based coloring):**
For z-scores, factor betas, or any value where simple +/- isn't enough:

```json
{
  "field": "z_score",
  "headerName": "Z-Score",
  "cellDataType": "number",
  "formatterFn": "none",
  "decimalPlaces": 2,
  "renderFn": "columnColor",
  "renderFnParams": {
    "colorRules": [
      {"condition": "gte", "value": 2.0, "color": "red", "fill": true},
      {"condition": "gte", "value": 1.5, "color": "orange", "fill": false},
      {"condition": "lte", "value": -2.0, "color": "red", "fill": true},
      {"condition": "lte", "value": -1.5, "color": "orange", "fill": false}
    ]
  }
}
```

**Consequence:** Remove `color`, `_*_color` fields from all backend responses. The backend returns raw numeric values; the frontend handles all coloring via `columnsDefs`. This is cleaner, faster, and respects the separation of concerns.

### Flag Replacement with HoverCard

**Problem:** `"flag": "🔴"` tells you nothing. Why is it flagged?

**Solution:** Replace all `flag` fields with a `signal` field containing a short human-readable label, and use `hoverCard` renderFn for rich context:

```json
{
  "field": "signal",
  "headerName": "Signal",
  "cellDataType": "text",
  "renderFn": "hoverCard",
  "renderFnParams": {
    "hoverCard": {
      "cellField": "signal",
      "title": "{ticker} Alert",
      "markdown": "### {signal}\n**Trigger:** {signal_detail}\n**Current:** {pct_change}\n**Threshold:** {signal_threshold}"
    }
  }
}
```

Backend changes: replace `"flag": "🔴"` with:
```python
{
    "signal": "Large Move" if abs_pct > 3 else ("Elevated" if abs_pct > 1.5 else ""),
    "signal_detail": f"Abs change {abs_pct:.1f}% exceeds 3% threshold",
    "signal_threshold": "3.0%",
}
```

For z-score alerts:
```python
{
    "signal": "Extreme" if abs(z) >= 2 else "Elevated",
    "signal_detail": f"Z-score {z:.2f} is {abs(z):.1f}σ from 1Y mean",
    "signal_threshold": f"{z_threshold}σ",
}
```

### Click-to-Drill via cellOnClick

Every table with a `ticker` column gets click-to-drill:

```json
{
  "field": "ticker",
  "headerName": "Ticker",
  "cellDataType": "text",
  "pinned": "left",
  "renderFn": "cellOnClick",
  "renderFnParams": {
    "actionType": "groupBy",
    "groupBy": {
      "paramName": "symbol"
    }
  }
}
```

This means clicking "PYPL" in `universe_movers` immediately updates `stock_chart`, `factor_bar`, `attribution_waterfall`, etc. on the same tab (if grouped).

### Sparkline Columns for Inline Time Series

For tables that benefit from inline trend visualization (e.g., `macro_returns`, `attribution_summary`), add a sparkline column. Backend returns an array of recent values:

```python
# In macro_inputs response, add:
"price_history": [66200, 66500, 66800, 67100, 66873]  # last 5 closes
```

```json
{
  "field": "price_history",
  "headerName": "5D Trend",
  "cellDataType": "object",
  "sparkline": {
    "type": "line",
    "options": {
      "stroke": "#2563eb",
      "strokeWidth": 2,
      "pointsOfInterest": {
        "firstLast": {"fill": "#94A3B8", "size": 3},
        "minimum": {"fill": "#EF5350", "size": 4},
        "maximum": {"fill": "#22c55e", "size": 4}
      }
    }
  }
}
```

### Hidden Utility Columns

Fields that exist for sorting/filtering but shouldn't be displayed use `"hide": true`:

```json
{
  "field": "pct_change_raw",
  "headerName": "Change (raw)",
  "cellDataType": "number",
  "hide": true
}
```

This replaces the current pattern of popping `pct_change_raw` from the response dict in Python.

### Proper Number Formatting

All numeric columns get explicit formatting. No more raw floats:

| Data Type | formatterFn | decimalPlaces | Example |
|-----------|-------------|---------------|---------|
| % change | `percent` | 2 | +2.34% |
| Price | `none` | 2 | 150.25 |
| Volume | `int` | — | 1,234,567 |
| Beta | `none` | 3 | 1.234 |
| Z-score | `none` | 2 | -1.85 |
| Market cap | `none` | — | (pre-formatted as $4.2B) |
| R² | `none` | 3 | 0.847 |

### Full columnsDefs Example: `universe_movers`

```json
"data": {
  "table": {
    "showAll": true,
    "enableCharts": true,
    "columnsDefs": [
      {
        "field": "ticker",
        "headerName": "Ticker",
        "cellDataType": "text",
        "pinned": "left",
        "renderFn": "cellOnClick",
        "renderFnParams": {
          "actionType": "groupBy",
          "groupBy": {"paramName": "symbol"}
        }
      },
      {
        "field": "sub_sector",
        "headerName": "Sub-Sector",
        "cellDataType": "text"
      },
      {
        "field": "last_price",
        "headerName": "Last Price",
        "cellDataType": "number",
        "formatterFn": "none",
        "decimalPlaces": 2,
        "chartDataType": "series"
      },
      {
        "field": "pct_change",
        "headerName": "% Change",
        "cellDataType": "number",
        "formatterFn": "percent",
        "decimalPlaces": 2,
        "renderFn": "greenRed",
        "chartDataType": "series"
      },
      {
        "field": "volume",
        "headerName": "Volume",
        "cellDataType": "number",
        "formatterFn": "int"
      },
      {
        "field": "mktcap_fmt",
        "headerName": "Mkt Cap",
        "cellDataType": "text"
      },
      {
        "field": "signal",
        "headerName": "Signal",
        "cellDataType": "text",
        "renderFn": "hoverCard",
        "renderFnParams": {
          "hoverCard": {
            "cellField": "signal",
            "title": "{ticker} Signal",
            "markdown": "**{signal}**\n\n{signal_detail}"
          }
        }
      },
      {
        "field": "pct_change_raw",
        "hide": true
      }
    ]
  }
}
```

### Backend Changes Required

1. **Return raw numerics, not pre-formatted strings.** Currently `pct_change` returns `"+2.34%"`. Should return `2.34` (a float). AgGrid's `formatterFn: "percent"` handles the display formatting. This is required for `greenRed` to work — it needs a number, not a string.

2. **Remove all `color` and `_*_color` fields.** The frontend handles coloring through `columnsDefs`.

3. **Replace `flag` with `signal` + `signal_detail` + `signal_threshold`.** Structured context instead of emoji.

4. **Add sparkline data arrays** where beneficial (macro monitor, attribution summary).

5. **Keep `pct_change_raw` (or equivalent sort key) in the response** but mark it `hide: true` in columnsDefs instead of popping it in Python.

---

## SEC Filing Viewer: `multi_file_viewer` Widget

Replace the broken `sec_filing_viewer` (markdown type, HTML→text conversion) with OpenBB's native `multi_file_viewer` widget that can render PDFs/documents directly.

### Widget Configuration
```json
"sec_filing_viewer": {
  "name": "SEC Filing Viewer",
  "description": "View SEC filings inline — 10-K, 10-Q, 8-K, proxy statements",
  "category": "SEC & Fundamentals",
  "type": "multi_file_viewer",
  "endpoint": "sec_filing_document",
  "gridData": {"w": 40, "h": 24},
  "params": [
    {
      "paramName": "symbol",
      "type": "endpoint",
      "label": "Symbol",
      "optionsEndpoint": "/symbols",
      "value": "PYPL"
    },
    {
      "paramName": "filing",
      "type": "endpoint",
      "label": "Filing",
      "optionsEndpoint": "/sec_filing_options",
      "optionsParams": {"symbol": "$symbol"},
      "roles": ["fileSelector"],
      "multiSelect": true,
      "style": {"popupWidth": 500}
    }
  ]
}
```

### New Endpoints

**`/sec_filing_options`** — Returns available filings for a given symbol as dropdown options:
```python
@router.get("/sec_filing_options")
def sec_filing_options(symbol: str = Query("PYPL")):
    """Cascading dropdown: returns recent filings for selected symbol."""
    # Fetch from EDGAR submissions API
    # Return format:
    return [
        {
            "label": "10-K — 2024-02-15",
            "value": "https://www.sec.gov/Archives/edgar/data/.../10k.htm",
            "extraInfo": {
                "description": "Annual report FY2024",
                "rightOfDescription": "10-K"
            }
        },
        ...
    ]
```

**`/sec_filing_document`** — Returns the filing content for the viewer:
```python
@router.get("/sec_filing_document")
def sec_filing_document(filing: str = Query(...)):
    """Fetch and return SEC filing for multi_file_viewer."""
    # filing param = URL from /sec_filing_options
    # For HTML filings: return as-is with data_type "html" or convert to pdf
    # For PDF filings: return URL reference directly
    return [
        {
            "url": filing,  # SEC EDGAR URL
            "data_format": {
                "data_type": "pdf",
                "filename": "10-K_2024.pdf"
            }
        }
    ]
```

**Note:** Most SEC filings are HTML, not PDF. The `multi_file_viewer` may need the filing URL passed directly. If HTML rendering isn't supported natively, we can use a server-side HTML→PDF conversion (e.g., `weasyprint`) to produce a PDF on-the-fly. Alternatively, EDGAR provides an "ix viewer" URL that wraps filings in a clean format — we can link to that.

### Cascading Dropdown Interaction

The key UX improvement: `filing` dropdown is *dependent* on `symbol` via `optionsParams: {"symbol": "$symbol"}`. When you change the symbol, the filing list refreshes to show that company's recent filings. This is the hierarchical modification pattern applied to document selection.

---

## Multi-Select Parameter Overhaul

Every param below converts from single-select `text` or `endpoint` to `multiSelect: true` endpoint-backed dropdown. Backend routes change from `str = Query("All")` to `str = Query("All")` where "All" is default but comma-separated values are accepted (e.g., `sub_sector=Payment Networks,Digital Payments`).

### Sub-Sector Filter (applies to ~12 widgets)
```json
{
  "paramName": "sub_sector",
  "type": "endpoint",
  "label": "Sub-Sectors",
  "optionsEndpoint": "/sub_sectors",
  "multiSelect": true,
  "value": "All",
  "style": { "popupWidth": 400 }
}
```
Backend: parse comma-separated, union tickers from all selected sub-sectors. "All" = no filter.

### Factor Filter (new — applies to factor_heatmap, factor_zscore_alerts)
```json
{
  "paramName": "factors",
  "type": "endpoint",
  "label": "Factors",
  "optionsEndpoint": "/factors",
  "multiSelect": true,
  "value": "Mkt-RF,SMB,HML,Mom,ST-Rev,Crypto-Beta,Rate-Sensitivity,Credit-Cycle,Payments-Volume,Fintech-vs-Bank",
  "style": { "popupWidth": 450 }
}
```
Backend: filter the factor matrix columns to only selected factors. Default = all factors.

### Symbol Multi-Select (for stock_chart overlay mode)
```json
{
  "paramName": "symbols",
  "type": "endpoint",
  "label": "Symbols",
  "optionsEndpoint": "/symbols",
  "multiSelect": true,
  "value": "PYPL",
  "style": { "popupWidth": 400 }
}
```
Backend: fetch aggregates for each selected ticker, normalize to 100 at period start, overlay on single chart. Limit to 5 tickers max.

### Form Type Multi-Select (SEC tab)
```json
{
  "paramName": "forms",
  "type": "endpoint",
  "label": "Form Types",
  "optionsEndpoint": "/sec_form_types",
  "multiSelect": true,
  "value": "All",
  "style": { "popupWidth": 350 }
}
```
Backend: filter filings where form is in the selected set.

### Event Type Multi-Select (corporate actions calendar)
```json
{
  "paramName": "event_types",
  "type": "endpoint",
  "label": "Event Types",
  "optionsEndpoint": "/event_types",
  "multiSelect": true,
  "value": "dividends,splits,earnings",
  "style": { "popupWidth": 350 }
}
```
New `/event_types` endpoint returns `[{label: "Dividends", value: "dividends"}, ...]`. Backend: include events matching any selected type.

### 8-K Event Type Multi-Select
```json
{
  "paramName": "event_type",
  "type": "endpoint",
  "label": "8-K Events",
  "optionsEndpoint": "/sec_8k_events",
  "multiSelect": true,
  "value": "all",
  "style": { "popupWidth": 500 }
}
```

### Implementation Pattern (Backend)
```python
def _parse_multi(param: str, all_values: list[str]) -> list[str]:
    """Parse multi-select param. 'All' or empty → full list, else split on comma."""
    if not param or param.strip().lower() == "all":
        return all_values
    return [v.strip() for v in param.split(",") if v.strip()]
```

This helper gets used in every route that accepts a multi-select param.

---

## New Endpoints Required

### 1. `stock_chart` — Price Chart (single or multi-overlay)
```
GET /stock_chart?symbols=PYPL&period_unit=months&period_value=3&chart_type=candlestick
GET /stock_chart?symbols=PYPL,SQ,AFRM&period_unit=months&period_value=3&chart_type=line
```
- Single symbol: candlestick + volume subplot + SMA(50)/SMA(200) overlays
- Multi-symbol (2-5): auto-switches to normalized line chart (rebased to 100), no volume subplot
- Uses `get_aggregates()` for each ticker
- `chart_type` param: candlestick (default for single) / line (default for multi, forced for multi)

### 2. `normalized_price_chart` — Pairs Normalized Price Overlay
```
GET /normalized_price_chart?pair_mode=preset&pair=V_MA&period_unit=years&period_value=1
```
- Fetches price series for both legs via `get_aggregates()`
- Rebases both to 100 at start of period
- Two-line overlay chart

### 3. `rsi_divergence_chart` — Dual-Leg RSI Time Series
```
GET /rsi_divergence_chart?pair_mode=preset&pair=V_MA&period_unit=months&period_value=3
```
- Fetches RSI(14) time series for both legs via Polygon `/v1/indicators/rsi` with higher limit
- Two lines + horizontal bands at 30 and 70
- Visual divergence identification

---

## Endpoints to Remove

These routes can stay in the codebase (backward compat) but will have no widget pointing to them:

- `/subsector_factor_exposure`
- `/subsector_attribution`
- `/rolling_momentum`
- `/technical_confirmation`
- `/covariance_heatmap`
- `/sec_filing_search`
- `/sec_filing_viewer`
- `/sec_filing_timeline`
- `/sec_universe_filings`
- `/sec_13f_holders`
- `/sec_proxy_filings`
- `/dividend_calendar` (standalone)
- `/split_history`
- `/ipo_monitor`
- `/universe_reference`

---

## Bug Fixes Required

1. **`routes_corporate.py` param mismatch.** The `dividend_calendar` route uses `days_ahead` param but `widgets.json` defines `start_date`/`end_date`. Either update the route to accept `start_date`/`end_date`, or revert the widget def. Recommendation: update the route since date pickers are the right UX.

2. **`corporate_actions_calendar` on Morning Pulse** should be the single source for dividends/splits/earnings. The standalone `dividend_calendar` and `split_history` widgets are redundant.

3. **`apps.json` groups** reference params like `"period"` and `"lookback"` that don't match the new `period_unit`/`period_value` params. These groups need to be updated or simplified.

---

## Widget Count Summary

| Tab | Before | After |
|-----|--------|-------|
| Morning Pulse | 6 | 6 |
| Factor Monitor | 5 | — (merged) |
| Return Attribution | 5 | — (merged) |
| Factor & Attribution | — | 8 |
| Group Performance | 5 | 4 |
| Pairs Lab | 6 | 7 |
| Corporate Actions | 4 | — (absorbed) |
| SEC & Fundamentals | 12 | 7 |
| **Total** | **44** | **32** |

Net reduction of 12 widgets. 3 new high-value charts added. 1 widget redesigned (sec_filing_viewer → multi_file_viewer). 15 low-value or redundant widgets removed. Every remaining table widget gets full `columnsDefs` with proper rendering.

---

## apps.json Group Redesign

| Group | Param | Syncs |
|-------|-------|-------|
| Group 1 | `symbol` (default: PYPL) | Morning Pulse: `universe_movers` → `stock_chart`; Factor tab: alerts → all single-stock charts; SEC: all company widgets |
| Group 2 | `beta_mode` (default: kalman) | All factor/attribution charts |
| Group 3 | `pair` (default: V_MA) | All Pairs Lab widgets |
| Group 4 | `sub_sector` (default: All) | Tables with sub-sector filter |

Removed the stale `period`/`lookback` groups — period is per-widget, not global.
