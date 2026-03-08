---
name: api-discovery
description: Explore APIs and data sources to discover what's possible, understand data shapes, and plan optimal OpenBB widget strategies before building. Use when user wants to understand an API, explore possibilities, or figure out which widgets to build.
---

# API Discovery & Possibilities

You are an expert at exploring APIs, understanding data shapes, and mapping them to the best possible OpenBB Workspace experience. This skill sits **before** the app-builder — it helps users who look at an API and think "I don't know what I can do with this" or "I don't know which widget type gets the most out of this data."

## Quick Reference

| Command | Action |
|---------|--------|
| "Explore this API: {url}" | Full API discovery walkthrough |
| "What can I build with {API name}?" | Possibilities brainstorming |
| "How should I use the PDF widget?" | Widget-specific optimization guide |
| "I'm a {role}, what should I build?" | Persona-driven recommendations |

## Execution Modes

| Mode | Triggers | Behavior |
|------|----------|----------|
| **Explore** | URL, "explore", "discover", "what's available" | Fetch API docs, map all endpoints, categorize data shapes |
| **Possibilities** | "what can I", "possibilities", "ideas", "brainstorm" | Generate widget ideas and dashboard concepts from API |
| **Optimize** | "best widget for", "how to use", "optimal", "get value" | Deep-dive on matching data to the ideal widget type |
| **Persona** | "I'm a", "my role is", "I need to", "use case" | Tailor recommendations to user's role and workflow |

**Mode detection**: Check user's first message for trigger phrases. Combine modes when appropriate (e.g., "Explore this API, I'm a policy researcher" = Explore + Persona).

## Pipeline Overview

```
Phase 1: API Reconnaissance    → Fetch docs, catalog endpoints, identify data shapes
Phase 2: Data Shape Analysis   → Classify each endpoint's output type
Phase 3: Widget Mapping        → Match data shapes to optimal OpenBB widget types
Phase 4: Parameter Strategy    → Design user-facing params from API query options
Phase 5: Persona Fit           → Tailor to user's role and workflow
Phase 6: Possibilities Report  → Present actionable dashboard concepts
```

For detailed API exploration techniques, see [API-EXPLORER.md](references/API-EXPLORER.md).
For widget optimization strategies, see [WIDGET-OPTIMIZER.md](references/WIDGET-OPTIMIZER.md).
For persona-based planning, see [PERSONA-MAPPER.md](references/PERSONA-MAPPER.md).

---

## Phase 1: API Reconnaissance

**Goal**: Understand everything the API offers before making any widget decisions.

### Steps

1. **Fetch documentation** — Use WebFetch on the API docs URL. If docs redirect or are unavailable, try:
   - `{base_url}/docs` (FastAPI/Swagger)
   - `{base_url}/api-docs`
   - `{base_url}/swagger.json` or `{base_url}/openapi.json`
   - WebSearch for `"{API name}" API documentation`

2. **Catalog endpoints** — For each endpoint, record:
   - HTTP method and path
   - Required vs optional parameters
   - Response format (JSON array, object, PDF, XML, HTML)
   - Rate limits or pagination
   - Authentication requirements

3. **Identify data shapes** — Classify each endpoint output:

| Data Shape | Description | Example |
|------------|-------------|---------|
| **Tabular** | Array of objects with consistent keys | `/documents.json` → list of records |
| **Single Record** | One object with detailed fields | `/documents/{id}.json` → single doc |
| **Time Series** | Records with date/time + values | `/counts_by_date.json` → daily counts |
| **Document/PDF** | Full document content or PDF URL | `/documents/{id}.pdf` → PDF file |
| **Narrative Text** | Long-form text, summaries, analysis | `/documents/{id}/abstract` → text |
| **Hierarchical** | Nested categories, trees, org charts | `/agencies.json` → nested structure |
| **Metric/Scalar** | Single value or small set of KPIs | `/statistics` → counts, averages |
| **Feed/Stream** | Chronological items (news, events) | `/recent_articles` → latest items |

4. **Document auth requirements** — Note API keys, tokens, or open access.

**Output**: Present a structured API catalog to the user.

For the complete reconnaissance process, see [API-EXPLORER.md](references/API-EXPLORER.md).

---

## Phase 2: Data Shape Analysis

**Goal**: For each discovered endpoint, understand the response structure deeply enough to choose the right widget.

### Key Questions Per Endpoint

1. **What are the fields/columns?** List every field with its data type.
2. **How many records?** Typical result set size (affects widget choice).
3. **Is it filterable?** What query params narrow results?
4. **Is there a date dimension?** Time-series vs snapshot.
5. **Are there linkable URLs?** PDF links, external references, source documents.
6. **Is there rich text?** Markdown-compatible content, HTML, abstracts.
7. **Are there numeric aggregates?** Counts, sums, averages suitable for metrics.

### Example: Federal Register API

```
GET /documents.json
├── Data Shape: Tabular (array of document objects)
├── Key Fields: title, type, abstract, pdf_url, publication_date, agencies
├── Filterable By: conditions[term], conditions[agencies], conditions[type]
├── Date Dimension: publication_date (time-series possible)
├── Linkable URLs: pdf_url, html_url
├── Rich Text: abstract (narrative), body (HTML)
├── Numeric Aggregates: count (total results)
└── Pagination: page, per_page (max 1000)
```

**Output**: Annotated data shape analysis for each useful endpoint.

---

## Phase 3: Widget Mapping

**Goal**: Match each data shape to the OpenBB widget type that extracts maximum value.

### The Widget Decision Matrix

For the complete decision matrix and optimization strategies, see [WIDGET-OPTIMIZER.md](references/WIDGET-OPTIMIZER.md).

### Quick Mapping Rules

| Data Shape | Best Widget | Why | Alternative |
|------------|-------------|-----|-------------|
| Tabular (many rows) | `table` | Sort, filter, export, chart-convert | `live_grid` if real-time |
| Tabular (few rows) | `table` with `state.chartView` | Users see both data and chart | `chart` if visualization-first |
| Time Series | `chart` (Plotly line/bar) | Visual trends over time | `table` with chart state |
| Single Record | `markdown` | Formatted detail view | `table` (1-row) |
| Document/PDF | `pdf` | Native PDF viewing | `html` if HTML available |
| Narrative Text | `markdown` | Readable formatted text | `newsfeed` if article-like |
| Hierarchical | `table` with grouping | Collapse/expand categories | `markdown` (tree view) |
| Metric/Scalar | `metric` | KPI cards with deltas | `markdown` (formatted stats) |
| Feed/Stream | `newsfeed` | Title + date + excerpt + body | `table` (sortable feed) |
| Mixed Content | `omni` | AI-driven dynamic layout | Combine multiple widgets |

### PDF Widget — Getting Maximum Value

The `pdf` widget is powerful but often underused. Optimal patterns:

1. **Direct PDF URL**: Endpoint returns `{"url": "https://...pdf"}` — widget renders the PDF inline
2. **Dynamic PDF selection**: Use a `table` widget with document list + `pdf` widget in same group — clicking a row loads that document's PDF
3. **Parameter-driven**: Add params like `document_id` so users can navigate to specific documents

```json
{
  "doc_viewer": {
    "name": "Document Viewer",
    "type": "pdf",
    "endpoint": "document_pdf",
    "params": [
      {
        "paramName": "document_number",
        "type": "text",
        "label": "Document Number",
        "value": ""
      }
    ]
  }
}
```

The endpoint should return: `{"url": "https://example.com/document.pdf"}`

### Newsfeed Widget — Structured Content

Best for chronological content with title/date/body structure:

```python
@app.get("/feed")
def feed():
    return [
        {
            "title": "Document Title",
            "date": "2024-01-15",
            "author": "Agency Name",
            "excerpt": "First 200 chars of abstract...",
            "body": "Full abstract or content in **markdown**",
            "url": "https://link-to-source.gov"
        }
    ]
```

---

## Phase 4: Parameter Strategy

**Goal**: Translate API query options into user-friendly OpenBB widget parameters.

### Parameter Translation Rules

| API Parameter | OpenBB Param Type | Strategy |
|---------------|-------------------|----------|
| Free-text search (`q`, `term`, `query`) | `text` | Direct mapping, good default empty |
| Category filter (finite set) | `text` with `options` | Fetch possible values, make dropdown |
| Category filter (large set) | `endpoint` | Dynamic dropdown from backend endpoint |
| Date range (`start_date`, `end_date`) | `date` | Use `$currentDate` modifiers for defaults |
| Numeric limit (`per_page`, `limit`) | `number` | Set sensible default (20-50) |
| Boolean flag (`include_x`, `only_y`) | `boolean` | Direct mapping |
| Sort order | `text` with `options` | Map API sort values to labels |
| ID/identifier | `text` or `endpoint` | Text if user knows ID, endpoint if browsable |

### Param Optimization Tips

1. **Don't expose everything** — Only surface params that change the user experience meaningfully. Hide pagination (handle server-side), internal IDs, format flags.

2. **Smart defaults** — Set defaults that show useful data immediately:
   - Date: `$currentDate-1M` (last month)
   - Limit: 25 (not too few, not overwhelming)
   - Type: Most common document type

3. **Dependent params** — If city depends on country, use `optionsParams`:
   ```json
   {
     "paramName": "subagency",
     "type": "endpoint",
     "optionsEndpoint": "/subagencies",
     "optionsParams": {"agency": "$agency"}
   }
   ```

4. **Group sync** — When multiple widgets share a context (e.g., all about the same document), use parameter groups so clicking one widget updates others.

For complete parameter strategy patterns, see [WIDGET-OPTIMIZER.md](references/WIDGET-OPTIMIZER.md#parameter-strategy).

---

## Phase 5: Persona Fit

**Goal**: Tailor widget selection and layout to how the user actually works.

For detailed persona profiles and workflow mapping, see [PERSONA-MAPPER.md](references/PERSONA-MAPPER.md).

### Quick Persona Profiles

| Persona | Primary Widgets | Key Features | Layout Style |
|---------|----------------|--------------|--------------|
| **Researcher** | `table` + `pdf` + `markdown` | Deep search, document viewing, notes | 2-tab: Search / Document |
| **Monitor** | `newsfeed` + `metric` + `table` | Latest updates, KPI tracking, alerts | Single dense dashboard |
| **Analyst** | `table` + `chart` + `metric` | Data exploration, trends, comparisons | Multi-tab with chart focus |
| **Executive** | `metric` + `chart` + `markdown` | High-level KPIs, summaries | Single tab, metrics on top |
| **Compliance** | `table` + `pdf` + `newsfeed` | Regulatory tracking, document review | 2-tab: Feed / Review |

---

## Phase 6: Possibilities Report

**Goal**: Present the user with concrete, actionable dashboard concepts they can hand off to the app-builder skill.

### Report Format

Present findings as a structured report:

```markdown
# API Discovery Report: {API Name}

## API Overview
- **Base URL**: {url}
- **Auth**: {none/key/token}
- **Rate Limits**: {if any}
- **Total Endpoints Explored**: {N}

## Data Available
{Table of endpoints with data shapes}

## Recommended Dashboards

### Dashboard Concept 1: "{Name}"
**Best for**: {persona}
**Widgets**:
| Widget | Type | Data Source | Key Params |
|--------|------|------------|------------|
| {name} | {type} | {endpoint} | {params} |

**Layout sketch**:
```
┌──────────────────┬──────────────────┐
│  Search/Filter   │   Document PDF   │
│  (table)         │   (pdf)          │
│  w:20 h:15       │   w:20 h:15      │
├──────────────────┴──────────────────┤
│  Recent Activity (newsfeed) w:40    │
└─────────────────────────────────────┘
```

**To build**: Tell the app-builder:
> "Build an OpenBB app called {name}. Use {API} with these widgets: {list}. I need {params}."
```

### Key Principles

1. **Show, don't tell** — Include ASCII layout sketches so users can visualize the dashboard
2. **Multiple concepts** — Offer 2-3 dashboard ideas for different use cases
3. **Actionable handoff** — Each concept includes the exact prompt to give the app-builder skill
4. **Be honest about limits** — Note any endpoints that won't work well (rate limits, auth issues, complex pagination)

---

## Combining with App Builder

This skill produces a **Discovery Report**. The user can then:

1. Pick a dashboard concept from the report
2. Use the provided prompt with the `openbb-app-builder` skill
3. The app-builder picks up exactly where discovery left off

The discovery report acts as a bridge — it does the thinking so the builder can do the making.

---

## Common API Patterns & How to Handle Them

### REST APIs with JSON (Most Common)
- Fetch docs, catalog endpoints, map directly to widgets
- Example: Federal Register, CoinGecko, SEC EDGAR

### GraphQL APIs
- Explore schema with introspection query
- Map queries to individual widget endpoints
- Backend acts as GraphQL→REST translator

### APIs Returning XML/HTML
- Backend parses and converts to JSON
- XML feeds → newsfeed widget
- HTML content → markdown widget (strip tags) or html widget

### APIs with PDF Downloads
- Backend provides PDF URL passthrough
- Pair with table widget for document browsing
- Use pdf widget for viewing

### APIs with Rate Limits
- Note limits in discovery report
- Recommend caching strategy (5-15 min)
- Suggest `runButton: true` for expensive endpoints
- Backend handles rate limit compliance

### APIs Requiring Pagination
- Backend aggregates pages transparently
- Expose `limit` param to user (not page number)
- Set reasonable default (25-50 items)
