# API Discovery & Possibilities

Explore APIs and data sources to understand what's possible before building OpenBB apps.

## What it does

This skill sits **before** the app-builder in the workflow. It helps users who look at an API and don't know:
- What data is actually available
- Which widget types get the most value from each data shape
- How to structure parameters for their use case
- What a dashboard should look like for their role

## Usage

```
"Explore this API: https://www.federalregister.gov/developers/documentation/api/v1"
```

```
"What can I build with the SEC EDGAR API?"
```

```
"I'm a compliance officer — how should I use the Federal Register API?"
```

```
"How do I get the most out of the PDF widget?"
```

## Modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| Explore | API URL, "explore", "discover" | Catalogs endpoints, classifies data shapes |
| Possibilities | "what can I", "ideas" | Generates dashboard concepts |
| Optimize | "best widget for", "how to use" | Deep-dive on widget-data matching |
| Persona | "I'm a...", "my role is..." | Tailors recommendations to your workflow |

## Output

Produces a **Discovery Report** with:
- API capability catalog
- Data shape analysis for each endpoint
- Widget recommendations with rationale
- Parameter strategy
- 2-3 dashboard concept sketches with ASCII layouts
- Ready-to-use prompts for the `openbb-app-builder` skill

## How it connects to App Builder

1. Run `api-discovery` to explore an API
2. Pick a dashboard concept from the report
3. Copy the generated prompt into `openbb-app-builder`
4. The builder creates the complete app

Discovery does the thinking. Builder does the making.
