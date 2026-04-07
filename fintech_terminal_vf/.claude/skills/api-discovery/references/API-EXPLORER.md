# API Explorer Reference

Detailed techniques for discovering and cataloging API capabilities.

## Step-by-Step API Reconnaissance

### Step 1: Find the Documentation

Try these sources in order:

1. **User-provided URL** — Fetch directly with WebFetch
2. **Standard doc paths** — Try `{base}/docs`, `{base}/api-docs`, `{base}/swagger.json`, `{base}/openapi.json`
3. **Web search** — Search for `"{API name}" API documentation endpoints`
4. **GitHub repos** — Look for API client libraries that reveal endpoints
5. **Interactive explorers** — Some APIs have sandbox/playground pages

### Step 2: Catalog Every Endpoint

Create a structured catalog:

```markdown
## Endpoint Catalog: {API Name}

### Base URL: {url}
### Auth: {type}
### Rate Limits: {details}

---

### Endpoint: GET /documents.json
- **Purpose**: Search and list documents
- **Parameters**:
  | Param | Type | Required | Description | Example |
  |-------|------|----------|-------------|---------|
  | conditions[term] | string | No | Full-text search | "climate change" |
  | conditions[agencies][] | string | No | Filter by agency | "environmental-protection-agency" |
  | conditions[type][] | string | No | Document type | "RULE", "NOTICE" |
  | conditions[publication_date][gte] | date | No | Published after | "2024-01-01" |
  | per_page | int | No | Results per page | 25 (max 1000) |
  | page | int | No | Page number | 1 |
  | order | string | No | Sort order | "relevance", "newest" |
- **Response Shape**: Array of objects
- **Key Response Fields**:
  | Field | Type | Widget-Relevant | Notes |
  |-------|------|-----------------|-------|
  | title | string | Yes - display | Document title |
  | type | string | Yes - filter | RULE, NOTICE, PRORULE, PRESDOCU |
  | abstract | string | Yes - content | Summary text (can be long) |
  | pdf_url | string | Yes - PDF widget | Direct link to PDF |
  | html_url | string | Yes - link | Web version |
  | publication_date | date | Yes - date filter | ISO date |
  | agencies[].name | string | Yes - filter | Issuing agencies |
  | document_number | string | Yes - ID | Unique identifier |
  | citation | string | Yes - display | Federal Register citation |
- **Pagination**: Yes, via `page` and `per_page`
- **Example**: `GET /documents.json?conditions[term]=solar&per_page=10`
```

### Step 3: Test Key Endpoints

When possible, make sample requests to verify:

1. **Response structure** — Does the actual response match docs?
2. **Field completeness** — Are advertised fields always present or sometimes null?
3. **Default behavior** — What happens with no parameters?
4. **Error responses** — What does a bad request look like?

Use WebFetch to test:
```
WebFetch: {base_url}/endpoint?param=value
Prompt: Show me the complete JSON response structure with all fields
```

### Step 4: Identify Hidden Capabilities

Many APIs have capabilities not obvious from docs:

1. **Faceted search** — Can you get counts by category? (Great for metric widgets)
2. **Nested includes** — Can you embed related data? (Reduces API calls)
3. **Aggregation endpoints** — Counts, statistics, summaries (metric/chart widgets)
4. **Export/bulk endpoints** — CSV, bulk JSON (table widgets with large datasets)
5. **Metadata endpoints** — Lists of valid values (dropdown options for params)

---

## Data Shape Classification Guide

### How to Classify Each Endpoint

For each endpoint, answer these questions to determine its data shape:

```
1. Does it return multiple items or one?
   ├── Multiple → Is there a date/time dimension?
   │   ├── Yes → TIME SERIES
   │   └── No → Is it a list of similar records?
   │       ├── Yes → TABULAR
   │       └── No → HIERARCHICAL
   └── One → What kind of content?
       ├── Document/PDF → DOCUMENT
       ├── Numbers/stats → METRIC
       ├── Long text → NARRATIVE
       └── Mixed fields → SINGLE RECORD

2. Is the data chronological/feed-like?
   ├── Yes → Does each item have title + body?
   │   ├── Yes → FEED (newsfeed widget)
   │   └── No → TIME SERIES (chart widget)
   └── No → Other classification applies

3. Does the endpoint return a file?
   ├── PDF → DOCUMENT (pdf widget)
   ├── CSV → TABULAR (table widget, parse server-side)
   ├── Image → HTML (html widget with <img>)
   └── HTML → NARRATIVE (markdown widget, strip tags) or HTML (html widget)
```

### Data Shape → Widget Suitability Matrix

| Data Shape | Primary Widget | Suitability Score | Notes |
|------------|---------------|-------------------|-------|
| **TABULAR** | | | |
| ├── <20 rows | `table` | 10/10 | Perfect fit, users can chart-convert |
| ├── 20-100 rows | `table` | 9/10 | Add pagination or scroll |
| ├── 100-1000 rows | `table` | 7/10 | Consider filtering params |
| └── 1000+ rows | `table` + params | 6/10 | Must filter server-side |
| **TIME SERIES** | | | |
| ├── 1-2 series | `chart` (line) | 10/10 | Clear trend visualization |
| ├── 3-5 series | `chart` (multi-line) | 8/10 | Add legend, use distinct colors |
| └── Many series | `table` + state.chartView | 7/10 | Let user choose what to chart |
| **DOCUMENT** | | | |
| ├── PDF URL | `pdf` | 10/10 | Direct viewing |
| ├── PDF binary | `pdf` (via proxy) | 8/10 | Backend serves as URL proxy |
| └── HTML document | `html` or `markdown` | 7/10 | Strip JS, keep formatting |
| **METRIC** | | | |
| ├── 1-6 values | `metric` | 10/10 | Clean KPI display |
| ├── With delta | `metric` with delta | 10/10 | Shows change/trend |
| └── 7+ values | `table` (1-row) | 6/10 | Too many for metrics |
| **FEED** | | | |
| ├── title + date + body | `newsfeed` | 10/10 | Perfect fit |
| ├── title + date only | `newsfeed` | 7/10 | Missing body, still works |
| └── No dates | `table` | 8/10 | Newsfeed needs dates |
| **NARRATIVE** | | | |
| ├── Markdown-compatible | `markdown` | 10/10 | Direct rendering |
| ├── Plain text | `markdown` | 8/10 | Works but no formatting |
| └── HTML | `html` | 9/10 | Full HTML support (no JS) |

---

## Common API Patterns

### Pattern 1: Search + Detail (Most Government APIs)

```
GET /search?q=term → list of results (TABULAR)
GET /items/{id} → single item detail (SINGLE RECORD)
GET /items/{id}/pdf → document (DOCUMENT)
```

**Optimal widget layout**:
- `table` widget for search results
- `markdown` or `pdf` widget for detail view
- Group them: clicking a search result loads the detail
- `metric` widget for result count

### Pattern 2: Category Browse (Reference APIs)

```
GET /categories → list of categories (HIERARCHICAL)
GET /categories/{id}/items → items in category (TABULAR)
```

**Optimal widget layout**:
- `table` widget with category as a dropdown param
- Or nested table with row grouping by category

### Pattern 3: Time-Series Data (Financial/Statistical APIs)

```
GET /data?start=date&end=date → time-stamped records (TIME SERIES)
GET /summary → aggregate statistics (METRIC)
```

**Optimal widget layout**:
- `chart` widget for trend visualization
- `metric` widget for summary stats
- `table` widget for raw data access
- Date params with `$currentDate` modifiers

### Pattern 4: News/Feed (Media/Government APIs)

```
GET /articles?topic=x → chronological items (FEED)
GET /articles/{id} → full article (NARRATIVE)
```

**Optimal widget layout**:
- `newsfeed` widget for the feed
- `markdown` widget for full article
- Topic as dropdown param

### Pattern 5: Document Repository (Regulatory/Legal APIs)

```
GET /documents?search=x → document list (TABULAR)
GET /documents/{id} → metadata (SINGLE RECORD)
GET /documents/{id}/content → full text (NARRATIVE)
GET /documents/{id}/pdf → PDF (DOCUMENT)
```

**Optimal widget layout**:
- `table` widget for search/browse
- `pdf` widget for document viewing (grouped with table)
- `markdown` widget for abstracts/summaries
- `metric` widget for document counts by type

---

## Building the Endpoint Catalog

### Template for User Presentation

Present your findings to the user in this format:

```markdown
# API Discovery: {API Name}

## What This API Offers

{2-3 sentence plain-English summary of what the API provides and who typically uses it}

## Available Data

### Category 1: {e.g., "Document Search"}
| What You Can Get | Data Shape | Best Widget | Example |
|------------------|------------|-------------|---------|
| {description} | {shape} | {widget} | {sample params} |

### Category 2: {e.g., "Statistics"}
| What You Can Get | Data Shape | Best Widget | Example |
|------------------|------------|-------------|---------|
| {description} | {shape} | {widget} | {sample params} |

## Parameters You Can Control
| What to Filter/Search | How It Works | Widget Param Type | Default Suggestion |
|-----------------------|--------------|-------------------|--------------------|
| {description} | {API mechanism} | {OpenBB type} | {value} |

## Limitations to Know About
- {Rate limits}
- {Auth requirements}
- {Missing features}
- {Data gaps}

## What's NOT Possible
{Be explicit about what the API can't do, to set expectations}
```

### Key Principles

1. **Plain English first** — Describe what the API does before technical details
2. **Show the value** — For each endpoint, explain *why* a user would care
3. **Be honest about limits** — Don't oversell what the API can do
4. **Concrete examples** — Show actual parameter values, not just parameter names
5. **Group by use case** — Don't just list endpoints alphabetically
