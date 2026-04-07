# Widget Optimizer Reference

How to match data shapes to the optimal OpenBB widget type and extract maximum value from each widget.

## The Core Principle

**The right widget is the one that lets the user act on the data fastest.** Not the prettiest, not the most technically impressive — the one that answers their question with the least friction.

---

## Widget-by-Widget Optimization Guide

### Table Widget (`type: "table"`)

**When it's the best choice:**
- Data has 3+ columns with consistent structure
- Users need to sort, filter, or compare rows
- Users might want to create their own charts from the data
- You're unsure — table is the safest default

**Optimization strategies:**

1. **Column ordering matters** — Put the most important column first (or pinned left). For search results, that's usually the title. For financial data, that's the symbol.

2. **Use cellOnClick for drill-down** — If you have a detail view (PDF, markdown), make the ID/title column clickable:
   ```json
   {
     "field": "title",
     "renderFn": "cellOnClick",
     "renderFnParams": {
       "actionType": "groupBy",
       "groupByParamName": "document_id"
     }
   }
   ```

3. **Pre-configure chart view** — If the data is chart-worthy, set `state.chartView.enabled: true` so users see a chart by default but can switch to table:
   ```json
   {
     "state": {
       "chartView": {
         "enabled": true,
         "chartType": "bar"
       }
     }
   }
   ```

4. **Color-code important values** — Use `renderFn: "greenRed"` for values where positive/negative matters.

5. **Hide internal columns** — Don't show IDs, API-internal fields, or URLs as columns. Use them for linking/actions but hide from display:
   ```json
   {
     "state": {
       "columnState": {
         "default": {
           "columnVisibility": {
             "hiddenColIds": ["id", "api_url", "internal_ref"]
           }
         }
       }
     }
   }
   ```

**Common mistakes:**
- Too many columns (>10 visible) — hide less important ones
- No sorting default — set the most useful sort
- Missing filter params — if the API supports filtering, expose it

---

### Chart Widget (`type: "chart"`)

**When it's the best choice:**
- Time-series data with clear trend
- Comparing 2-5 data series
- Distribution visualization (histogram, pie)
- User needs visual pattern recognition

**Optimization strategies:**

1. **Choose the right chart type:**
   | Data Pattern | Chart Type | Plotly Trace |
   |-------------|------------|--------------|
   | Trend over time | Line | `go.Scatter(mode="lines")` |
   | Comparison over time | Multi-line | Multiple `go.Scatter` |
   | Category comparison | Bar | `go.Bar` |
   | Distribution | Histogram | `go.Histogram` |
   | Proportion | Pie/Donut | `go.Pie` |
   | Correlation | Scatter | `go.Scatter(mode="markers")` |
   | Range/bands | Area | `go.Scatter(fill="tozeroy")` |

2. **Always support dark/light themes:**
   ```python
   template = "plotly_dark" if theme == "dark" else "plotly_white"
   ```

3. **Always support `raw` parameter** — Returns data as JSON array for AI analysis.

4. **No title** — The widget frame provides the title.

5. **Responsive margins:**
   ```python
   fig.update_layout(margin=dict(l=40, r=20, t=20, b=40))
   ```

**Common mistakes:**
- Chart with only 1-2 data points — use `metric` instead
- Chart with 20+ series — too cluttered, use table with chart state
- Hardcoded colors that clash with dark theme

---

### Metric Widget (`type: "metric"`)

**When it's the best choice:**
- 1-6 key performance indicators
- Data that answers "how much?" or "how many?"
- Values with meaningful change/delta
- Summary statistics

**Optimization strategies:**

1. **Always include delta when possible:**
   ```python
   {"label": "Documents Published", "value": "1,234", "delta": "+12% vs last month"}
   ```

2. **Use subvalue for context:**
   ```python
   {"label": "Avg Processing Time", "value": "23 days", "subvalue": "Last 90 days"}
   ```

3. **Format values for readability** — "$1.2M" not "1234567.89"

4. **Group related metrics** — Keep all metrics on the same row in the layout (same y position, sequential x positions, h=5-6)

5. **Keep it to 3-6 metrics** — More than 6 metrics dilutes attention. If you have more, prioritize or use a second row.

**Common mistakes:**
- Showing raw unformatted numbers
- Missing context (what period? what comparison?)
- Too many metrics (>8 becomes a wall of numbers)

---

### PDF Widget (`type: "pdf"`)

**When it's the best choice:**
- API provides PDF URLs or PDF content
- Documents need to be viewed in original formatting
- Legal, regulatory, or official documents where layout matters
- Reports with tables/charts that don't convert well to HTML

**Optimization strategies:**

1. **Return URL format** — The endpoint must return a JSON object with a `url` field:
   ```python
   @app.get("/document_pdf")
   def document_pdf(document_id: str = Query("")):
       pdf_url = f"https://api.example.gov/documents/{document_id}/pdf"
       return {"url": pdf_url}
   ```

2. **Pair with a search/browse table** — The most powerful PDF pattern is:
   - Table widget (left) showing document list with clickable titles
   - PDF widget (right) showing the selected document
   - Both in same group, clicking a table row updates the PDF

   Layout:
   ```json
   [
     {"i": "doc_search", "x": 0, "y": 0, "w": 20, "h": 18, "groups": ["Group 1"]},
     {"i": "doc_viewer", "x": 20, "y": 0, "w": 20, "h": 18, "groups": ["Group 1"]}
   ]
   ```

3. **Handle missing PDFs gracefully:**
   ```python
   @app.get("/document_pdf")
   def document_pdf(document_id: str = Query("")):
       if not document_id:
           return {"url": ""}  # Empty state
       return {"url": f"https://.../{document_id}/pdf"}
   ```

4. **Add a document number/ID param** — Let users jump to a specific document:
   ```json
   {
     "paramName": "document_number",
     "type": "text",
     "label": "Document Number",
     "description": "Enter a document number to view its PDF",
     "value": ""
   }
   ```

**Common mistakes:**
- Endpoint returns the binary PDF content instead of a URL object
- No way to navigate between documents (missing browse/search companion widget)
- PDF URL requires auth that the browser can't provide (use backend proxy)

---

### Markdown Widget (`type: "markdown"`)

**When it's the best choice:**
- Formatted text summaries or analysis
- Document abstracts or descriptions
- Help text or instructions
- AI-generated content
- Single-record detail views

**Optimization strategies:**

1. **Use real markdown formatting** — Headers, bold, lists, tables all render:
   ```python
   return f"""
   ## {document['title']}

   **Published**: {document['date']} | **Agency**: {document['agency']}

   ### Abstract
   {document['abstract']}

   ### Key Details
   | Field | Value |
   |-------|-------|
   | Type | {document['type']} |
   | Citation | {document['citation']} |

   [View on Federal Register]({document['html_url']})
   """
   ```

2. **Include links** — Markdown links are clickable in the widget.

3. **Dynamic content based on params** — Pair with a table to show detail for selected row.

**Common mistakes:**
- Dumping raw JSON — format it as readable markdown
- Missing line breaks between sections
- Overly long content (markdown widgets have a scrollable area, but keep it reasonable)

---

### Newsfeed Widget (`type: "newsfeed"`)

**When it's the best choice:**
- Chronological content with title + date
- News articles, press releases, announcements
- Regulatory notices, filings, submissions
- Any "latest updates" type content

**Optimization strategies:**

1. **Required fields for optimal display:**
   ```python
   {
       "title": "Document title (required)",
       "date": "2024-01-15 (required, ISO format)",
       "author": "Agency name (optional but recommended)",
       "excerpt": "First 150-200 chars... (optional)",
       "body": "Full content in **markdown** (optional but recommended)",
       "url": "https://link-to-source (optional)"
   }
   ```

2. **Excerpt from abstract** — If the API provides an abstract, truncate to ~200 chars for the excerpt and put the full text in body.

3. **Author = Organization** — For government APIs, use the agency name as "author".

4. **Sort by date descending** — Most recent first.

5. **Add type/category filters** — Let users filter the feed by document type or topic.

**Common mistakes:**
- Missing dates (newsfeed renders poorly without them)
- No body text (users can't expand to read more)
- Not sorting by date

---

### HTML Widget (`type: "html"`)

**When it's the best choice:**
- Custom visualizations that need CSS
- Embedded content (iframes, but no JS)
- Rich formatted content that exceeds markdown capabilities
- Image-heavy content

**Note:** HTML widgets do NOT support JavaScript. For interactive content, use `chart` (Plotly) instead.

---

### Omni Widget (`type: "omni"`)

**When it's the best choice:**
- AI-generated dynamic content
- Content that changes structure based on query
- Mixed content types in one widget

---

## Parameter Strategy Deep Dive

### The Parameter Funnel

Think of parameters as a funnel — broad filters at the top, specific selections at the bottom:

```
Level 1: CATEGORY (dropdown)    → "What kind of thing?"
Level 2: SEARCH (text)          → "Which ones specifically?"
Level 3: DATE RANGE (date)      → "From when?"
Level 4: SORT/LIMIT (dropdown)  → "How to organize?"
```

**Not every widget needs all levels.** Most need 1-2 params. Only search-heavy widgets need 3+.

### Translating API Params to OpenBB Params

#### When to use `text` with `options` (static dropdown):
- Fewer than ~15 options
- Options rarely change
- You can enumerate them from docs

```json
{
  "paramName": "document_type",
  "type": "text",
  "label": "Document Type",
  "value": "RULE",
  "options": [
    {"label": "Final Rule", "value": "RULE"},
    {"label": "Proposed Rule", "value": "PRORULE"},
    {"label": "Notice", "value": "NOTICE"},
    {"label": "Presidential Document", "value": "PRESDOCU"}
  ]
}
```

#### When to use `endpoint` (dynamic dropdown):
- Options come from the API
- Options change over time
- Large list (agencies, categories, etc.)

```json
{
  "paramName": "agency",
  "type": "endpoint",
  "label": "Agency",
  "optionsEndpoint": "/agencies",
  "value": ""
}
```

Backend provides options:
```python
@app.get("/agencies")
def get_agencies():
    # Fetch from API or cache
    return [
        {"label": "EPA", "value": "environmental-protection-agency"},
        {"label": "SEC", "value": "securities-and-exchange-commission"},
        # ...
    ]
```

#### When to use `text` (free input):
- Search queries
- IDs the user knows
- Free-form input

#### When to use `date`:
- Any date filter
- Always provide smart defaults with `$currentDate` modifiers:
  - `$currentDate` — today
  - `$currentDate-1w` — one week ago
  - `$currentDate-1M` — one month ago
  - `$currentDate-1y` — one year ago

### Parameters to NOT Expose

Some API params should be handled server-side, not shown to users:

| API Param | Why Hide It | Handle How |
|-----------|-------------|------------|
| `page` / `offset` | Pagination is internal | Aggregate in backend |
| `format` | Always JSON for OpenBB | Hardcode in backend |
| `api_key` | Security | Environment variable |
| `fields` / `select` | Technical detail | Choose optimal fields in backend |
| `callback` / `jsonp` | Legacy compat | Ignore |
| `sort_direction` | Usually paired with sort | Combine into one dropdown |

---

## Layout Patterns for Common Data Combinations

### Pattern A: Search + Detail (Side by Side)
```
┌────────────────────┬────────────────────┐
│  Search Results    │  Detail View       │
│  (table, w:20)     │  (markdown, w:20)  │
│  clickable rows    │  shows selected    │
│                    │                    │
│  Group 1           │  Group 1           │
└────────────────────┴────────────────────┘
```

### Pattern B: Search + PDF Viewer
```
┌────────────────────┬────────────────────┐
│  Document List     │  PDF Viewer        │
│  (table, w:18)     │  (pdf, w:22)       │
│  clickable rows    │  shows selected    │
│                    │                    │
│  Group 1           │  Group 1           │
└────────────────────┴────────────────────┘
```

### Pattern C: KPIs + Feed
```
┌──────────┬──────────┬──────────┬──────────┐
│ Metric 1 │ Metric 2 │ Metric 3 │ Metric 4 │
│  w:10    │  w:10    │  w:10    │  w:10    │
│  h:5     │  h:5     │  h:5     │  h:5     │
├──────────┴──────────┴──────────┴──────────┤
│  News Feed / Activity (newsfeed, w:40)     │
│  h:14                                      │
└────────────────────────────────────────────┘
```

### Pattern D: Multi-Tab Dashboard
```
Tab 1: Overview
┌──────────┬──────────┬──────────┬──────────┐
│ Metric   │ Metric   │ Metric   │ Metric   │
├──────────┴──────────┼──────────┴──────────┤
│  Activity Chart     │  Recent Items       │
│  (chart, w:20)      │  (newsfeed, w:20)   │
└─────────────────────┴─────────────────────┘

Tab 2: Search & Explore
┌────────────────────┬────────────────────┐
│  Search Results    │  Document View     │
│  (table, w:20)     │  (pdf, w:20)       │
└────────────────────┴────────────────────┘

Tab 3: Data & Analysis
┌────────────────────────────────────────────┐
│  Full Data Table (table, w:40, h:18)       │
└────────────────────────────────────────────┘
```

### Pattern E: Focused Document Research
```
┌──────────────────────────────────────────┐
│  Search Bar (table with text param)       │
│  w:40, h:8                                │
├────────────────────┬─────────────────────┤
│  Abstract/Summary  │  PDF Viewer          │
│  (markdown, w:16)  │  (pdf, w:24)         │
│  h:16              │  h:16                │
│  Group 1           │  Group 1             │
└────────────────────┴─────────────────────┘
```
