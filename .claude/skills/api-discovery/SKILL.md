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
Phase 0: Discovery Interview   → Iterative conversation to understand user's goals and mental model
Phase 1: API Reconnaissance    → Fetch docs, catalog endpoints, identify data shapes
Phase 2: Data Shape Analysis   → Classify each endpoint's output type
Phase 3: Widget Mapping        → Match data shapes to optimal OpenBB widget types
Phase 4: Parameter Strategy    → Design ontology-respecting params that mirror how users think about the data
Phase 5: Persona Fit           → Tailor to user's role and workflow
Phase 6: Possibilities Report  → Present actionable dashboard concepts with rich param plans
```

For detailed API exploration techniques, see [API-EXPLORER.md](references/API-EXPLORER.md).
For widget optimization strategies, see [WIDGET-OPTIMIZER.md](references/WIDGET-OPTIMIZER.md).
For persona-based planning, see [PERSONA-MAPPER.md](references/PERSONA-MAPPER.md).

---

## Phase 0: Discovery Interview

**Goal**: Build a deep understanding of what the user wants through iterative conversation — NOT a one-shot dump of questions.

**THIS IS NOT OPTIONAL.** Do not skip to reconnaissance. The interview shapes everything that follows.

### How the Interview Works

This is a **multi-round conversation**, not a checklist. Ask 2-3 questions at a time, listen to answers, then ask follow-up questions that go deeper based on what you learned. Continue until you have a clear picture.

### Round 1: Intent & Mental Model

Start by understanding how the user **thinks about** this data:

- "What are you trying to accomplish with this API? What decisions will this dashboard help you make?"
- "When you think about this data, what are the main dimensions you navigate by?" (e.g., time, geography, category, entity)
- "Walk me through a typical workflow — what would you search for first, then drill into?"

### Round 2: Navigation & Ontology (based on Round 1 answers)

Dig into how the information is naturally structured:

- "You mentioned {dimension} — how granular do you need to go? (e.g., year vs month vs day, state vs county vs city)"
- "Are there categories or types that matter to you? What are the key distinctions?"
- "When you're looking at a specific {entity}, what related information do you want to see alongside it?"
- "Do you ever need to cross-reference between {dimension A} and {dimension B}?"

### Round 3: Refinement & Priorities

Confirm understanding and prioritize:

- "So your primary workflow is: {summarize}. Is that right, or am I missing something?"
- "If you could only have 3 filters on a widget, which would be most important?"
- "Are there any edge cases or less-common searches you'd still want to support?"

### Round 4+: Go Deeper If Needed

Keep asking until the user confirms you've captured their vision. Signs you're NOT done:
- User mentions a use case you haven't explored
- You don't understand the ontology well enough to design params
- You haven't discussed how different widgets should relate to each other

**Output**: A clear mental model of:
1. The user's primary workflows and decision-making needs
2. The information ontology — what dimensions, categories, and relationships matter
3. How granular navigation should be along each dimension
4. Which views should link together (e.g., table click → document viewer)

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

## Phase 4: Parameter Strategy — Ontology-Driven Design

**Goal**: Design params that respect how users **think about** the information — not just what the API technically accepts.

### The Core Principle

**DO NOT** just map API query params 1:1 to widget params. Instead:
1. Understand the **ontology** of the information (from Phase 0 interview)
2. Design params that let users **navigate** the data the way they naturally think about it
3. Build **layered specificity** — broad category → subcategory → specific item

### Anti-Pattern: The Lazy Single-ID Param

```json
// BAD — forces user to know the document ID
{
  "paramName": "document_id",
  "type": "text",
  "label": "Document ID"
}
```

This is the **worst possible UX**. The user has to go find an ID somewhere else before they can use the widget. Never do this unless there's truly no alternative.

### Correct Pattern: Ontology-Respecting Navigation

```json
// GOOD — lets user navigate by how they think about the data
[
  {
    "paramName": "agency",
    "type": "endpoint",
    "label": "Agency",
    "optionsEndpoint": "/agencies",
    "value": ""
  },
  {
    "paramName": "document_type",
    "type": "text",
    "label": "Type",
    "options": [
      {"label": "All Types", "value": ""},
      {"label": "Rules", "value": "RULE"},
      {"label": "Proposed Rules", "value": "PRORULE"},
      {"label": "Notices", "value": "NOTICE"},
      {"label": "Presidential Documents", "value": "PRESDOCU"}
    ],
    "value": ""
  },
  {
    "paramName": "date_start",
    "type": "date",
    "label": "From Date",
    "value": "$currentDate-1M"
  },
  {
    "paramName": "date_end",
    "type": "date",
    "label": "To Date",
    "value": "$currentDate"
  },
  {
    "paramName": "search_term",
    "type": "text",
    "label": "Search Keywords",
    "value": ""
  },
  {
    "paramName": "sort_by",
    "type": "text",
    "label": "Sort By",
    "options": [
      {"label": "Newest First", "value": "newest"},
      {"label": "Relevance", "value": "relevance"},
      {"label": "Oldest First", "value": "oldest"}
    ],
    "value": "newest"
  }
]
```

### Ontology Analysis Checklist

For every API, identify these navigational dimensions and expose them as params:

| Dimension | Question | Param Type |
|-----------|----------|------------|
| **Category/Type** | What are the main kinds of things? | `options` dropdown or `endpoint` |
| **Source/Origin** | Who produces this data? (agency, author, org) | `endpoint` (dynamic list) |
| **Time** | When was it created/published/effective? | `date` range (start + end) |
| **Geography** | Where does it apply? (country, state, region) | `options` or `endpoint` |
| **Status/State** | What stage is it in? (draft, final, archived) | `options` dropdown |
| **Topic/Subject** | What is it about? | `text` (free search) or `options` |
| **Relationship** | How does it connect to other entities? | `endpoint` with `optionsParams` |
| **Magnitude** | How much/many? (size, amount, count) | `number` range |

### Building Param Hierarchies

When dimensions are **nested** (e.g., agency → subagency → office), use dependent params:

```json
[
  {
    "paramName": "agency",
    "type": "endpoint",
    "label": "Agency",
    "optionsEndpoint": "/agencies"
  },
  {
    "paramName": "subagency",
    "type": "endpoint",
    "label": "Sub-Agency",
    "optionsEndpoint": "/subagencies",
    "optionsParams": {"agency": "$agency"}
  }
]
```

### Parameter Translation Rules (Reference)

| API Parameter | OpenBB Param Type | Strategy |
|---------------|-------------------|----------|
| Free-text search (`q`, `term`, `query`) | `text` | Direct mapping, good default empty |
| Category filter (finite set) | `text` with `options` | Fetch possible values, make dropdown |
| Category filter (large set) | `endpoint` | Dynamic dropdown from backend endpoint |
| Date range (`start_date`, `end_date`) | `date` | Use `$currentDate` modifiers for defaults |
| Numeric limit (`per_page`, `limit`) | `number` | Set sensible default (20-50) |
| Boolean flag (`include_x`, `only_y`) | `boolean` | Direct mapping |
| Sort order | `text` with `options` | Map API sort values to labels |
| ID/identifier | **AVOID** — prefer browsable navigation (see above) | Only as last resort with `endpoint` |

### Param Design Principles

1. **Never force the user to know an ID** — Always provide a way to browse/discover entities through dropdowns, search, or linked widgets. If an ID is needed internally, hide it behind a user-friendly selector.

2. **Mirror the ontology** — If the data is organized by agency → type → date in the real world, your params should follow that same structure.

3. **Layered specificity** — Start broad (category, date range) and let users drill down. Don't make them specify everything up front.

4. **Smart defaults that show data** — Never start with empty results. Set defaults that show useful data immediately:
   - Date: `$currentDate-1M` (last month)
   - Limit: 25 (not too few, not overwhelming)
   - Type/Category: "All" or most common type

5. **Don't expose plumbing** — Hide pagination, format flags, internal IDs. Handle them server-side.

6. **Dependent params** — Use `optionsParams` when one dimension depends on another.

7. **Group sync** — When multiple widgets share a context (e.g., search table + document viewer), use parameter groups so selecting in one widget updates others.

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
