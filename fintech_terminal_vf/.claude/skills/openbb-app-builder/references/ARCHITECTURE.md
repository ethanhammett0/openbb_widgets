# Architecture Reference

System design overview for the OpenBB App Builder pipeline.

## Overview

This document describes a comprehensive harness for building OpenBB Workspace apps in a single shot. The harness consists of multiple interconnected reference docs and validation tools that guide the agent through the entire app creation lifecycle.

## Key Features

- **Reference Example Support**: Accept Streamlit, Gradio, React, Flask code and convert to OpenBB
- **Smart Interview**: Structured requirements gathering with sensible defaults
- **Automated Validation**: Scripts to validate widgets.json, apps.json, and live endpoints
- **Browser Testing**: Browser automation for end-to-end testing
- **Error Recovery**: Auto-fix common issues with retry logic

---

## Harness Philosophy

The goal is to transform app creation from a confusing multi-step journey into a guided, repeatable pipeline that:

1. **Accepts multiple input types** — Description, code, screenshots
2. **Gathers complete requirements upfront** — No surprises later
3. **Validates at each stage** — Catch errors early
4. **Provides confirmable artifacts** — User signs off before proceeding
5. **Tests automatically** — Verify before declaring success
6. **Self-corrects** — Loop back on failures

---

## Pipeline Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      OPENBB APP BUILDER HARNESS v2.0                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  INPUT TYPES SUPPORTED                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Description │ │  Streamlit  │ │   Gradio    │ │ React/Vue   │          │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘          │
│         └───────────────┴───────────────┴───────────────┘                  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         PHASE 1: INTERVIEW                           │  │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────────┐  │  │
│  │  │ Interactive Mode    │ OR │ Reference Analysis Mode             │  │  │
│  │  │ - Ask questions     │    │ - Parse code/screenshots            │  │  │
│  │  │ - Suggest defaults  │    │ - Extract components                │  │  │
│  │  │ - Gather specs      │    │ - Map to OpenBB widgets             │  │  │
│  │  └─────────────────────┘    └─────────────────────────────────────┘  │  │
│  │                                    │                                  │  │
│  │                                    ▼                                  │  │
│  │                           APP-SPEC.md (Artifact)                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │   PHASE 2   │────▶│   PHASE 3   │────▶│   PHASE 4   │                  │
│  │   WIDGET    │     │  DASHBOARD  │     │   PLANNER   │                  │
│  │  METADATA   │     │   LAYOUT    │     │             │                  │
│  └─────────────┘     └─────────────┘     └─────────────┘                  │
│        │                   │                   │                          │
│        ▼                   ▼                   ▼                          │
│  Widget specs        Tab structure         PLAN.md                        │
│  appended to         appended to           Step-by-step                   │
│  APP-SPEC.md         APP-SPEC.md           implementation                 │
│                                                                            │
│                                    │                                       │
│                                    ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         PHASE 5: BUILDER                             │  │
│  │  Creates:   main.py │ widgets.json │ apps.json │ requirements.txt   │  │
│  │             Dockerfile │ .env.example │ README.md                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       PHASE 6: VALIDATION                            │  │
│  │  • Schema check  •  Tab structure  •  Live endpoint testing          │  │
│  │  If validation fails: analyze → auto-fix → re-run (max 3 retries)   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│                                    ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       PHASE 7: TESTING                               │  │
│  │  1. Start uvicorn  2. Open pro.openbb.co  3. Add backend             │  │
│  │  4. Open app  5. Verify each widget  6. Check console errors         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Reference Files

| File | Phase | Purpose |
|------|-------|---------|
| `SKILL.md` | Entry | Master orchestrator, pipeline overview |
| `APP-INTERVIEW.md` | 1 | Requirements gathering, reference analysis |
| `WIDGET-METADATA.md` | 2 | Widget type specs, parameters, columns |
| `DASHBOARD-LAYOUT.md` | 3 | Layout design, grid system, groups |
| `APP-PLANNER.md` | 4 | Implementation plan generation |
| `OPENBB-APP.md` | 5 | Core implementation patterns |
| `VALIDATE.md` | 6 | Validation commands and error handling |
| `APP-TESTER.md` | 7 | Browser testing, debugging |

---

## Reference Example Support

### Supported Frameworks

| Framework | Detection | Component Mapping |
|-----------|-----------|-------------------|
| Streamlit | `import streamlit` | st.dataframe→table, st.line_chart→chart |
| Gradio | `import gradio` | gr.Dataframe→table, gr.Plot→chart |
| Flask | `from flask import` | Route analysis, return type inference |
| FastAPI | `from fastapi import` | Endpoint extraction, param mapping |
| React | `useState`, `useEffect` | Component structure, fetch analysis |

### Mapping Rules

```
Streamlit                    OpenBB Widget Type
─────────────────────────────────────────────────
st.dataframe()        →      table
st.table()            →      table
st.line_chart()       →      chart
st.area_chart()       →      chart
st.bar_chart()        →      chart
st.plotly_chart()     →      chart
st.metric()           →      metric
st.markdown()         →      markdown
st.text()             →      markdown
st.image()            →      html/markdown
st.selectbox()        →      param (endpoint)
st.multiselect()      →      param (endpoint, multiSelect)
st.slider()           →      param (number)
st.number_input()     →      param (number)
st.text_input()       →      param (text)
st.date_input()       →      param (date)
st.checkbox()         →      param (boolean)
st.tabs()             →      dashboard tabs
st.columns()          →      layout structure
st.sidebar            →      parameter groups
```

---

## Directory Structure

### Agent-Agnostic Skills Structure

```
.agents/
└── skills/
    ├── openbb-app-builder/
    │   ├── SKILL.md             # Master orchestrator (agent entry point)
    │   └── references/          # Docs loaded on demand
    │       ├── ARCHITECTURE.md      # This document
    │       ├── APP-INTERVIEW.md     # Phase 1: Requirements
    │       ├── WIDGET-METADATA.md   # Phase 2: Widget specs
    │       ├── DASHBOARD-LAYOUT.md  # Phase 3: Layout design
    │       ├── APP-PLANNER.md       # Phase 4: Plan generation
    │       ├── OPENBB-APP.md        # Phase 5: Implementation reference
    │       ├── VALIDATE.md          # Phase 6: Validation commands
    │       └── APP-TESTER.md        # Phase 7: Browser testing
    └── improve-openbb-skill/
        └── SKILL.md             # Skill to submit upstream improvements
```

### Generated App Structure

```
{app-name}/
├── APP-SPEC.md        # Requirements and specifications
├── PLAN.md            # Implementation plan
├── main.py            # FastAPI application
├── widgets.json       # Widget configurations
├── apps.json          # Dashboard layout
├── requirements.txt   # Python dependencies
├── Dockerfile         # Docker configuration
├── .env.example       # Environment template
└── README.md          # App documentation
```

---

## Error Recovery

### Auto-Fix Patterns

| Error Type | Detection | Auto-Fix |
|------------|-----------|----------|
| Missing required field | Validation error | Add with sensible default |
| Invalid widget type | Not in VALID_TYPES | Correct to closest match |
| Widget not found | Reference check | Add widget or fix reference |
| Overlapping layout | Position check | Adjust x/y coordinates |
| Invalid param type | Not in VALID_PARAMS | Correct to valid type |
| CORS error | Console/network | Add missing origin |

### Retry Logic

```
MAX_RETRIES = 3
for attempt in range(MAX_RETRIES):
    run validation
    if success → break
    apply auto-fixes
    if max retries exceeded → ask user for guidance
```

---

## Documentation vs Reality

**Important**: OpenBB Workspace's actual schema validation may differ from this documentation. When in doubt:

1. **Browser validation is authoritative** — Test against `pro.openbb.co`
2. **Fetch latest docs** — `https://docs.openbb.co/workspace/llms-full.txt`
3. **Trust error messages** — OpenBB's validator provides specific error messages

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Widget not loading | Wrong response format | Check endpoint returns correct type |
| CORS error | Missing origin | Add origin to FastAPI CORS config |
| 404 on endpoint | Route not registered | Verify @app.get decorator |
| Validation fails | Missing field | Run validation, fix reported errors |
| Browser test fails | Server not running | Start uvicorn first |

### Debug Commands

```bash
# Check server health
curl http://localhost:7779/

# Check widgets.json
curl http://localhost:7779/widgets.json | python -m json.tool

# Test specific endpoint
curl "http://localhost:7779/my_widget?param=value"
```
