# Persona Mapper Reference

How to tailor API discovery and widget recommendations to different user roles and workflows.

## Why Personas Matter

The same API can power completely different dashboards depending on who's using it. A lobbyist tracking the Federal Register needs different widgets than a compliance officer, even though they're pulling from the same endpoints.

**The persona determines:**
- Which endpoints matter most
- Which widget types to prioritize
- How many params to expose (simplicity vs power)
- Layout density (at-a-glance vs deep-dive)
- Default values (what should load first)
- Tab structure (single dashboard vs multi-view)

---

## Persona Identification

### How to Identify the User's Persona

Ask or infer from context:

1. **Direct statement**: "I'm a policy analyst" → clear persona
2. **Task description**: "I need to track new regulations" → Monitor persona
3. **Question style**: "What data can I cross-reference?" → Analyst persona
4. **Feature requests**: "I need to read the actual documents" → Researcher persona
5. **Vocabulary**: "stakeholders", "KPIs", "reporting" → Executive persona

### When the User Doesn't Know Their Persona

Ask: "How will you primarily use this dashboard?"

| If they say... | Persona |
|---------------|---------|
| "Keep up with what's new" | Monitor |
| "Dig into specific documents" | Researcher |
| "Analyze trends and patterns" | Analyst |
| "Report to leadership" | Executive |
| "Make sure we're compliant" | Compliance |
| "Find opportunities" | Scout |
| "Understand the landscape" | Explorer |

---

## Detailed Persona Profiles

### The Monitor

**Goal**: Stay informed about changes and new developments without missing anything.

**Mindset**: "Alert me to what's new and let me scan it quickly."

**Primary widgets:**
| Widget Type | Purpose | Priority |
|-------------|---------|----------|
| `newsfeed` | Latest updates chronologically | Essential |
| `metric` | Volume indicators ("12 new today") | High |
| `table` | Filtered list for specific tracking | Medium |

**Parameter philosophy:**
- Few params — mostly category/topic filters
- Date defaults to last 7 days
- Auto-refresh if API supports it
- Pre-filtered to user's areas of interest

**Layout style:**
```
┌──────────┬──────────┬──────────┬──────────┐
│ New Today│ This Week│ Pending  │ By Type  │
│ (metric) │ (metric) │ (metric) │ (metric) │
│  h:5     │  h:5     │  h:5     │  h:5     │
├──────────┴──────────┴──────────┴──────────┤
│  Latest Updates (newsfeed, w:40, h:16)     │
│  Sorted by date desc, category filter      │
└────────────────────────────────────────────┘
```

**Key considerations:**
- Default should show something immediately (no empty states)
- Prioritize recency over completeness
- Include notification-like metrics ("3 new since yesterday")
- Newsfeed body should have enough detail to decide "do I need to read more?"

---

### The Researcher

**Goal**: Find specific documents, read them thoroughly, and understand their context.

**Mindset**: "Help me find what I'm looking for and let me read it properly."

**Primary widgets:**
| Widget Type | Purpose | Priority |
|-------------|---------|----------|
| `table` | Search results with filtering | Essential |
| `pdf` | Document viewing | Essential |
| `markdown` | Abstracts, summaries, metadata | High |
| `metric` | Search result count | Low |

**Parameter philosophy:**
- Rich search params — text search, date range, category, type
- Multiple filter dimensions
- Sort options (relevance, date, title)
- Results per page control

**Layout style:**
```
Tab 1: Search
┌────────────────────┬────────────────────┐
│  Search Results    │  Document PDF      │
│  (table, w:18)     │  (pdf, w:22)       │
│  h:20              │  h:20              │
│  Text search,      │  Updates on row    │
│  date, type,       │  click             │
│  agency filters    │                    │
│  Group 1           │  Group 1           │
└────────────────────┴────────────────────┘

Tab 2: Document Detail
┌────────────────────────────────────────────┐
│  Document Metadata & Abstract              │
│  (markdown, w:40, h:20)                    │
│  Full formatted detail view                │
└────────────────────────────────────────────┘
```

**Key considerations:**
- PDF widget is critical — researchers read actual documents
- Table needs good column defs (title pinned left, date, type, agency)
- Search must be fast (no `runButton` unless API is slow)
- Support deep linking — let users navigate by document ID
- Abstracts in markdown help decide whether to open the full PDF

---

### The Analyst

**Goal**: Find patterns, trends, and insights across data. Compare and quantify.

**Mindset**: "Show me the numbers and let me slice the data."

**Primary widgets:**
| Widget Type | Purpose | Priority |
|-------------|---------|----------|
| `chart` | Trend visualization | Essential |
| `table` | Raw data for exploration | Essential |
| `metric` | Summary statistics | High |
| `markdown` | Analysis notes | Low |

**Parameter philosophy:**
- Date range is critical (compare periods)
- Category breakdowns
- Aggregation options (daily, weekly, monthly)
- Multiple grouping dimensions

**Layout style:**
```
Tab 1: Trends
┌──────────┬──────────┬──────────┬──────────┐
│ Total    │ Avg/Day  │ Top Cat  │ Growth   │
│ (metric) │ (metric) │ (metric) │ (metric) │
├──────────┴──────────┴──────────┴──────────┤
│  Trend Chart (chart, w:40, h:14)           │
│  Line/bar chart of activity over time      │
└────────────────────────────────────────────┘

Tab 2: Data Explorer
┌────────────────────────────────────────────┐
│  Full Dataset (table, w:40, h:20)          │
│  All columns, sort/filter enabled          │
│  state.chartView available for ad-hoc      │
└────────────────────────────────────────────┘
```

**Key considerations:**
- Charts should support multiple time granularities (daily/weekly/monthly param)
- Tables should expose all useful columns (analysts want to explore)
- Enable `state.chartView` so analysts can create their own visualizations
- Support raw mode for charts (AI can analyze the underlying data)
- Include comparative metrics (vs last period, growth %)

---

### The Executive

**Goal**: Get the high-level picture fast. No noise, just signal.

**Mindset**: "Tell me the 3-5 things I need to know right now."

**Primary widgets:**
| Widget Type | Purpose | Priority |
|-------------|---------|----------|
| `metric` | KPIs and key numbers | Essential |
| `chart` | One clear trend | High |
| `markdown` | Executive summary | High |
| `table` | Only if they ask | Low |

**Parameter philosophy:**
- Minimal — maybe just a time period selector
- Smart defaults that show the most relevant view
- Pre-filtered to the executive's scope

**Layout style:**
```
┌──────────┬──────────┬──────────┬──────────┐
│ KPI 1    │ KPI 2    │ KPI 3    │ KPI 4    │
│ (metric) │ (metric) │ (metric) │ (metric) │
│  h:6     │  h:6     │  h:6     │  h:6     │
├──────────┴──────────┼──────────┴──────────┤
│ Summary             │ Key Trend Chart     │
│ (markdown, w:20)    │ (chart, w:20)       │
│ h:12                │ h:12                │
└─────────────────────┴─────────────────────┘
```

**Key considerations:**
- Everything should load with no user interaction required
- Metrics need meaningful deltas ("vs last month")
- Executive summary in markdown — 3-5 bullet points
- One chart, not five — pick the most important trend
- Limit to single tab — executives don't tab-hop

---

### The Compliance Officer

**Goal**: Ensure nothing falls through the cracks. Track regulatory changes affecting the organization.

**Mindset**: "Show me everything relevant and help me track what I've reviewed."

**Primary widgets:**
| Widget Type | Purpose | Priority |
|-------------|---------|----------|
| `table` | Regulatory tracking list | Essential |
| `newsfeed` | New regulations feed | Essential |
| `pdf` | Full document review | High |
| `metric` | Pending review counts | High |

**Parameter philosophy:**
- Agency/category filters pre-set to relevant regulators
- Date range focused on compliance deadlines
- Document type filters (final rules vs proposed)
- Status-oriented (new, pending review, reviewed)

**Layout style:**
```
Tab 1: Tracker
┌──────────┬──────────┬──────────┬──────────┐
│ Pending  │ New This │ Final    │ Proposed │
│ Review   │ Week     │ Rules    │ Rules    │
│ (metric) │ (metric) │ (metric) │ (metric) │
├──────────┴──────────┴──────────┴──────────┤
│  Regulation Feed (newsfeed, w:40, h:14)    │
│  Filtered to relevant agencies/types       │
└────────────────────────────────────────────┘

Tab 2: Document Review
┌────────────────────┬────────────────────┐
│  Regulations List  │  Document PDF      │
│  (table, w:18)     │  (pdf, w:22)       │
│  h:20              │  h:20              │
│  Group 1           │  Group 1           │
└────────────────────┴────────────────────┘
```

---

### The Scout

**Goal**: Discover opportunities, identify emerging trends, find leads.

**Mindset**: "Help me spot what others might miss."

**Primary widgets:**
| Widget Type | Purpose | Priority |
|-------------|---------|----------|
| `table` | Browsable data with filters | Essential |
| `chart` | Trend/volume indicators | High |
| `newsfeed` | Recent relevant items | High |
| `markdown` | Context/summary for leads | Medium |

**Parameter philosophy:**
- Broad search first, then narrow
- Category exploration (browse different segments)
- Date range for trend analysis
- Keyword/topic search for specific opportunities

**Layout style:**
```
Tab 1: Explore
┌─────────────────────┬─────────────────────┐
│  Activity by Topic  │  Volume Trends      │
│  (chart, w:20)      │  (chart, w:20)      │
│  h:12               │  h:12               │
├─────────────────────┴─────────────────────┤
│  Latest Opportunities (table, w:40, h:12)  │
│  Searchable, filterable, sortable          │
└────────────────────────────────────────────┘
```

---

### The Explorer (Default/Unknown Persona)

**Goal**: Understand what's available and figure out what's useful.

**Mindset**: "I don't know what I need yet — help me discover it."

**Primary widgets:**
| Widget Type | Purpose | Priority |
|-------------|---------|----------|
| `table` | Data exploration | Essential |
| `metric` | Quick overview stats | High |
| `newsfeed` | Content sampling | Medium |
| `chart` | Data visualization | Medium |

**Parameter philosophy:**
- Sensible defaults that show interesting data immediately
- Easy-to-understand filters
- Not too many params (don't overwhelm)

**Layout style:**
```
Tab 1: Overview
┌──────────┬──────────┬──────────┬──────────┐
│ Stat 1   │ Stat 2   │ Stat 3   │ Stat 4   │
├──────────┴──────────┴──────────┴──────────┤
│  Sample Data (table, w:40, h:12)           │
│  Default query showing recent/popular      │
└────────────────────────────────────────────┘

Tab 2: Deep Dive
┌────────────────────┬────────────────────┐
│  Search/Filter     │  Detail View       │
│  (table, w:20)     │  (markdown, w:20)  │
└────────────────────┴────────────────────┘
```

---

## Persona Combinations

Users often blend personas. Handle combinations:

| Combination | Approach |
|-------------|----------|
| Researcher + Analyst | Search tab + Data/Charts tab |
| Monitor + Compliance | Feed with compliance filters + Document review tab |
| Executive + Monitor | Metrics dashboard with recent highlights |
| Scout + Analyst | Exploration tab with trend analysis tab |

---

## Asking the Right Questions

When mapping a persona, ask these follow-up questions:

### For all personas:
1. "How often will you check this dashboard?" (hourly → Monitor, daily → mixed, weekly → Analyst/Executive)
2. "Do you need to read full documents, or are summaries enough?" (full → Researcher, summaries → Monitor/Executive)
3. "Do you need to share or report on this data?" (yes → Executive, include export-friendly tables)

### For specific APIs:
4. "Which agencies/topics are relevant to you?" (pre-filter params)
5. "Do you need to track changes over time?" (yes → add charts)
6. "Are there specific document types you care about?" (filter defaults)

---

## Translating Persona to App Builder Prompt

Once the persona and API discovery are complete, generate a prompt for the `openbb-app-builder` skill:

```
Build an OpenBB app called "{Dashboard Name}".

Data source: {API name} ({base_url})
Auth: {none/key}

Target user: {persona description}

Widgets needed:
1. {widget_name} ({type}) - {purpose}
   - Endpoint: {API endpoint}
   - Params: {list key params}
2. {widget_name} ({type}) - {purpose}
   ...

Layout:
- Tab 1 "{name}": {description}
- Tab 2 "{name}": {description}

Groups:
- Group 1: Sync {param} across {widgets}

Key defaults:
- {param}: {value} (because {reason})
```

This prompt gives the app-builder everything it needs to skip the interview phase and go straight to building.
