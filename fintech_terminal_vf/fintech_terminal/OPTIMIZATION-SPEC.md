# Terminal Parameter & Display Optimization Spec
**Status:** DRAFT — Awaiting approval before any code changes
**Scope:** `widgets.json` + backend route changes across all tabs
**Guiding principle:** Bloomberg-grade configurability with human-readable labeling. Every parameter must reflect the actual data ontology — no arbitrary buckets, no lazy defaults.

---

## Cross-Terminal Standards (apply everywhere)

### 1. Return Window — Hierarchical Period Selector
**Replaces:** Raw `days_ahead` number inputs and bare `start_date` / `end_date` date pickers wherever a "period" is the intent.

**New pattern — two-param combo:**
```json
{
  "paramName": "period_unit",
  "type": "text",
  "label": "Period",
  "value": "months",
  "options": [
    { "label": "Days",   "value": "days" },
    { "label": "Months", "value": "months" },
    { "label": "Years",  "value": "years" },
    { "label": "YTD",    "value": "ytd" }
  ]
},
{
  "paramName": "period_value",
  "type": "number",
  "label": "# of Periods",
  "value": 1,
  "min": 1,
  "max": 36,
  "step": 1
}
```
- When `period_unit = "ytd"`, `period_value` is hidden (`"show": false` handled in backend — just ignored).
- Backend converts to `start_date` / `end_date` internally. No raw date pickers exposed unless the use case is truly calendar-anchored (e.g., earnings).
- **Applies to:** `universe_movers`, `gainers_losers`, all Group Performance widgets, all Attribution widgets, `rolling_momentum`, `cointegration_results`, `spread_chart`, `hedge_ratio_chart`, `pair_metrics`, `technical_confirmation`, `covariance_heatmap`.

### 2. Factor Lookback — Same Pattern
Same hierarchical period selector replaces all raw `lookback (days)` number inputs in Factor Monitor and Pairs Lab.

### 3. Bloomberg-Style Color Coding
**Applies to every table with numeric % change or return columns.**

Return a `_color_class` field (hidden from display, consumed by `renderFn`) OR use `renderFn: "greenRed"` on the column definition:

| Value | Color |
|-------|-------|
| > 0   | `#00C805` (Bloomberg green) |
| < 0   | `#FF3B30` (Bloomberg red) |
| = 0 or null | `#94A3B8` (muted white/slate) |
| ±0.1–0.5% | `#F59E0B` (amber — near-zero signal) |

**Number formatting standard:**
- Prices: `$X,XXX.XX` — always 2 decimal places, comma-separated thousands
- % changes: `+X.XX%` / `-X.XX%` — always signed, 2 decimal places
- Market cap: `$XB` / `$XM` (abbreviated, not raw dollar strings)
- Volumes: `XXM` / `XXK` (abbreviated)
- Betas: `X.XXX` (3 decimal places)
- Z-scores: `±X.XX` (2 decimal places, always signed)

### 4. Human-Readable Instrument Names
All instrument dropdowns use `extraInfo` with full names and asset class:
```json
{ "label": "Bitcoin (BTC)", "value": "bitcoin", "extraInfo": { "description": "Crypto — Risk-On Proxy", "rightOfDescription": "CoinGecko" } }
{ "label": "Duration Risk (TLT)", "value": "TLT", "extraInfo": { "description": "20+ Year Treasury ETF", "rightOfDescription": "Rates" } }
{ "label": "IG Credit Spreads (LQD)", "value": "LQD", "extraInfo": { "description": "Investment Grade Corp Bond ETF", "rightOfDescription": "Credit" } }
{ "label": "High Yield Spreads (HYG)", "value": "HYG", "extraInfo": { "description": "High Yield Corp Bond ETF", "rightOfDescription": "Credit" } }
{ "label": "Financials Benchmark (XLF)", "value": "XLF", "extraInfo": { "description": "SPDR Financial Select Sector ETF", "rightOfDescription": "Sector ETF" } }
{ "label": "Fintech Payments (IPAY)", "value": "IPAY", "extraInfo": { "description": "ETF Managers Payments ETF", "rightOfDescription": "Sector ETF" } }
{ "label": "Global Fintech (FINX)", "value": "FINX", "extraInfo": { "description": "Global X Fintech ETF", "rightOfDescription": "Sector ETF" } }
{ "label": "Disruptive Innovation (ARKF)", "value": "ARKF", "extraInfo": { "description": "ARK Fintech Innovation ETF", "rightOfDescription": "Sector ETF" } }
{ "label": "Ethereum (ETH)", "value": "ethereum", "extraInfo": { "description": "Crypto — Smart Contract Layer 1", "rightOfDescription": "CoinGecko" } }
{ "label": "Solana (SOL)", "value": "solana", "extraInfo": { "description": "Crypto — High-Throughput L1", "rightOfDescription": "CoinGecko" } }
```
New backend endpoint: `/macro_instruments` returns the above list organized by asset class group.

---

## Widget-by-Widget Changes

---

### TAB 1: Morning Pulse

#### Widget: Macro Factor Inputs → **Macro Returns Monitor**
**Current problem:** Static metric tiles with hardcoded instruments, 1-day return only, no selectability.
**Target:** Configurable multi-instrument returns table with hierarchical period selector and asset-class grouping.

**Type change:** `metric` → `table`
**New name:** `"Macro Returns Monitor"`

**New params:**
```json
"params": [
  {
    "paramName": "instruments",
    "type": "endpoint",
    "label": "Instruments",
    "optionsEndpoint": "/macro_instruments",
    "multiSelect": true,
    "value": ["bitcoin", "ethereum", "TLT", "HYG", "LQD", "XLF", "IPAY", "FINX", "ARKF"]
  },
  {
    "paramName": "period_unit",
    "type": "text",
    "label": "Period",
    "value": "days",
    "options": [
      { "label": "Days",   "value": "days" },
      { "label": "Months", "value": "months" },
      { "label": "Years",  "value": "years" },
      { "label": "YTD",    "value": "ytd" }
    ]
  },
  {
    "paramName": "period_value",
    "type": "number",
    "label": "# of Periods",
    "value": 1,
    "min": 1,
    "max": 36,
    "step": 1
  }
]
```

**New table columns returned:**
`instrument` | `asset_class` | `ticker_symbol` | `price` | `return_pct` | `period_label` | `flag`

Where `return_pct` is Bloomberg green/red colored, `period_label` reads e.g. "1D", "3M", "YTD", instrument names are human-readable.

**Backend changes needed:**
- New `/macro_instruments` endpoint returning the instrument options list above
- `macro_inputs` route rewritten to accept `instruments` (comma-separated) + `period_unit` + `period_value`
- Computes return over the specified window for each selected instrument
- For crypto: uses CoinGecko historical price endpoint (not just 24h change)
- For ETFs/equities: uses Polygon aggregates

---

#### Widget: Universe Pre-Market Movers
**Current problem:** `cap_tier` filter uses arbitrary Large/Mid/Small buckets with hardcoded dollar thresholds.

**Changes:**
1. Remove `cap_tier` dropdown entirely
2. Add two number params for min/max market cap (raw market cap in billions):
```json
{
  "paramName": "min_mktcap_b",
  "type": "number",
  "label": "Min Mkt Cap ($B)",
  "value": 0,
  "min": 0,
  "max": 500,
  "step": 0.5
},
{
  "paramName": "max_mktcap_b",
  "type": "number",
  "label": "Max Mkt Cap ($B)",
  "value": 500,
  "min": 0,
  "max": 500,
  "step": 0.5
}
```
3. Backend: filter by `market_cap >= min_mktcap_b * 1e9 AND <= max_mktcap_b * 1e9`
4. Return a `mktcap_fmt` column (e.g. `$4.2B`) alongside existing columns
5. Apply Bloomberg color coding to `pct_change` column

---

#### Widget: Fintech Gainers / Losers
**Changes:**
1. Apply Bloomberg green/red color coding to `pct_change` column
2. Format `prev_close` and `current_price` consistently as `$X.XX`
3. Add period selector (default 1D, same hierarchical pattern) so you can view 5D gainers/losers, not just today's

---

#### Widget: Spread Drift Alerts (Morning Pulse)
**Changes:**
1. Apply Bloomberg color coding to z-score column (red = extreme, amber = moderate)
2. The z-threshold slider stays but add a label clarifying what 1.5/2.0/2.5 means in context

---

#### Widget: Technical Signal Alerts
**No structural changes** — sub-sector filter is already correct. Add Bloomberg color coding to signal direction column.

---

#### Widget: Corporate Actions Calendar
**Current problem:** `days_ahead` slider is wrong control. Missing event types, sub-sector filter, earnings, lockup expirations.

**Full redesign:**
```json
"params": [
  {
    "paramName": "start_date",
    "type": "date",
    "label": "From Date",
    "value": "$currentDate"
  },
  {
    "paramName": "end_date",
    "type": "date",
    "label": "To Date",
    "value": "$currentDate+30D"
  },
  {
    "paramName": "event_types",
    "type": "text",
    "label": "Event Types",
    "value": "all",
    "options": [
      { "label": "All Events",    "value": "all" },
      { "label": "Dividends",     "value": "dividends" },
      { "label": "Splits",        "value": "splits" },
      { "label": "Earnings",      "value": "earnings" }
    ]
  },
  {
    "paramName": "sub_sector",
    "type": "endpoint",
    "label": "Sub-Sector",
    "optionsEndpoint": "/sub_sectors",
    "value": "All"
  }
]
```
- `$currentDate+30D` — need to verify if OpenBB supports forward-offset dynamic dates; if not, use a relative number param instead.
- Backend: add earnings dates from Polygon's earnings endpoint. Surface ex-div date, pay date, cash amount (formatted as yield %), and split ratios properly.
- Remove the standalone `dividend_calendar` widget from Corporate Actions tab — consolidate into this one with the event_types filter.

---

### TAB 2: Factor Monitor

#### All Factor Widgets — Lookback
**Replace all raw `lookback (days)` number inputs with the hierarchical period selector:**
```json
[
  {
    "paramName": "period_unit",
    "type": "text",
    "label": "Lookback Unit",
    "value": "months",
    "options": [
      { "label": "Days",   "value": "days" },
      { "label": "Months", "value": "months" },
      { "label": "Years",  "value": "years" }
    ]
  },
  {
    "paramName": "period_value",
    "type": "number",
    "label": "Lookback",
    "value": 3,
    "min": 1,
    "max": 24,
    "step": 1
  }
]
```
Backend: translate to trading days (`days * 1`, `months * 21`, `years * 252`).

**Affects:** `factor_heatmap`, `factor_bar`, `factor_drift`, `factor_zscore_alerts`, `subsector_factor_exposure`

#### Factor Heatmap — Ticker Cap
**Current problem:** `tickers = tickers[:15]` hardcoded cap is invisible to the user.

**Change:** Add an explicit `max_tickers` number param (default 15, max 50) so the cap is transparent and configurable. The heatmap height scales accordingly.

#### Factor Z-Score Alerts — Color Coding
Apply Bloomberg color coding to `z_score` column.

---

### TAB 3: Return Attribution

#### All Attribution Widgets
Replace `start_date` / `end_date` date pickers with the hierarchical period selector. Attribution over a period is more natural as "3 months" than picking two calendar dates.

---

### TAB 4: Group Performance

#### All Group Performance Widgets
Replace `start_date` / `end_date` date pickers with hierarchical period selector.
Add Bloomberg color coding to all return % columns in tables and bar charts.

---

### TAB 5: Pairs Lab

#### Major Redesign — Custom Pair Construction
**Current problem:** All pairs are pre-defined in `universe.py`. No ability to construct ad-hoc pairs.

**New pair selection architecture — two modes:**

**Mode A: Pre-defined pairs (default)**
```json
{
  "paramName": "pair_mode",
  "type": "text",
  "label": "Pair Mode",
  "value": "preset",
  "options": [
    { "label": "Pre-defined Pairs", "value": "preset" },
    { "label": "Custom Pair",       "value": "custom" }
  ]
},
{
  "paramName": "pair",
  "type": "endpoint",
  "label": "Pair",
  "optionsEndpoint": "/pairs",
  "value": "V_MA"
}
```

**Mode B: Custom pair (when `pair_mode = "custom"`)**
```json
{
  "paramName": "leg_a",
  "type": "endpoint",
  "label": "Leg A",
  "optionsEndpoint": "/symbols",
  "value": "PYPL"
},
{
  "paramName": "leg_b",
  "type": "endpoint",
  "label": "Leg B",
  "optionsEndpoint": "/symbols",
  "value": "SQ"
}
```

**Hedge ratio methodology per pair:**
```json
{
  "paramName": "beta_mode",
  "type": "text",
  "label": "Hedge Ratio",
  "value": "kalman",
  "options": [
    { "label": "Kalman Filter (Dynamic)", "value": "kalman" },
    { "label": "Rolling OLS",             "value": "rolling_ols" },
    { "label": "Fixed OLS (Constant)",    "value": "fixed_ols" }
  ]
}
```

**Backend changes:**
- When `pair_mode = "custom"`, `leg_a` and `leg_b` are used instead of looking up the preset pair
- Existing pair engine functions (`kalman_hedge_ratio`, etc.) already accept two price series — just need routing logic

#### Cointegration Results — Lookback
Replace raw `lookback (days)` with hierarchical period selector.

#### Spread Chart / Hedge Ratio Chart / Pair Metrics / Technical Confirmation
All get the new pair construction params above plus hierarchical lookback.

#### Covariance Heatmap
Replace raw `lookback (days)` with hierarchical period selector.

---

### TAB 6: Corporate Actions (dedicated tab)

#### Split History
Add `start_date` / `end_date` date range (not just sub-sector). This is a history table — it should be anchored to dates.

#### IPO Monitor
Replace `since_date` date picker with hierarchical period selector. Format market cap and price columns consistently.

#### Universe Reference
Add a text search param for company name search alongside sub-sector filter.

---

### TAB 7: SEC Filings

#### Major Addition — Inline Filing Viewer
**Current problem:** Filing links are returned but document text is not rendered inline.

**New widget: `sec_filing_viewer`**

```json
"sec_filing_viewer": {
  "name": "SEC Filing Viewer",
  "description": "Render full filing text inline — 10-K, 10-Q, 8-K, DEF 14A",
  "category": "SEC Filings",
  "type": "markdown",
  "endpoint": "sec_filing_viewer",
  "staleTime": 3600000,
  "gridData": { "w": 40, "h": 30 },
  "runButton": true,
  "params": [
    {
      "paramName": "symbol",
      "type": "endpoint",
      "label": "Ticker",
      "optionsEndpoint": "/symbols",
      "value": "PYPL"
    },
    {
      "paramName": "form_type",
      "type": "text",
      "label": "Filing Type",
      "value": "10-K",
      "options": [
        { "label": "Annual Report (10-K)",     "value": "10-K" },
        { "label": "Quarterly Report (10-Q)",  "value": "10-Q" },
        { "label": "Current Report (8-K)",     "value": "8-K" },
        { "label": "Proxy Statement (DEF 14A)","value": "DEF 14A" }
      ]
    },
    {
      "paramName": "section",
      "type": "text",
      "label": "Section",
      "value": "full",
      "options": [
        { "label": "Full Filing",        "value": "full" },
        { "label": "MD&A",               "value": "mda" },
        { "label": "Risk Factors",       "value": "risk" },
        { "label": "Financial Statements","value": "financials" }
      ]
    }
  ]
}
```

**Backend approach:**
- Fetch the filing index from `data.sec.gov/submissions/CIK{}.json` (already exists in `routes_sec.py`)
- Resolve the primary document `.htm` URL from the filing index
- Fetch the HTML document text from `www.sec.gov/Archives/edgar/data/...`
- Strip HTML tags, return clean markdown text
- For `section` filtering: use regex to extract common section headers (Item 1A for Risk Factors, Item 7 for MD&A, etc.)
- Return as a markdown string — OpenBB's `markdown` widget type renders this inline

**Note on size:** 10-K filings can be 200k+ characters. Implement a `max_chars` safety cap (default 50k, configurable) and surface a "showing first N chars" note when truncated.

---

## New Backend Endpoints Required

| Endpoint | Purpose |
|----------|---------|
| `/macro_instruments` | Returns hierarchical instrument options with human-readable names and `extraInfo` |
| `macro_inputs` rewrite | Accept `instruments`, `period_unit`, `period_value` — return table not metrics |
| `universe_movers` update | Replace cap_tier with min/max market cap in billions |
| `gainers_losers` update | Add period selector for multi-day return windows |
| `corporate_actions_calendar` update | Add `event_types` multiselect, `start_date`/`end_date` range, earnings data |
| `sec_filing_viewer` (new) | Fetch, parse, and return inline filing text as markdown |
| All factor/pairs lookback routes | Accept `period_unit` + `period_value`, convert internally to trading days |
| `spread_chart`, `pair_metrics`, etc. | Accept `pair_mode` + `leg_a` + `leg_b` in addition to existing `pair` param |

---

## What's NOT Changing
- Widget categories and tab structure — no tab reorganization
- Pairs engine, beta engine, attribution engine logic — backend math stays the same
- `apps.json` layout — no grid position changes
- Any widget not listed above — no unnecessary churn

---

## Implementation Order (if approved)

1. **Cross-terminal plumbing first:** hierarchical period selector backend utility function, Bloomberg color formatting helpers
2. **Macro Returns Monitor** — highest-visibility change, validates the new patterns
3. **Universe Movers / Gainers** — morning workflow core
4. **Factor Monitor lookbacks** — quick wins, same pattern across 5 widgets
5. **Corporate Actions Calendar** — redesign
6. **Pairs Lab custom pair construction** — most complex
7. **SEC Filing Viewer** — new widget, standalone

---

*Approve this spec to begin implementation. Changes will be applied to `widgets.json` and route files iteratively, one section at a time.*
