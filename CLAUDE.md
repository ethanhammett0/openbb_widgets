# OpenBB Widgets - Project Context

This is a collection of OpenBB Workspace backend apps and agent integrations.

## Available Skills

The `openbb-app-builder` skill is installed and ready. Use it to build new OpenBB apps:
- Trigger: "Build an OpenBB app for X" or "Convert this Streamlit app" or "Quick mode: build X"
- Skill location: `.claude/skills/openbb-app-builder/SKILL.md`
- Second skill: `improve-openbb-skill` — submit fixes/improvements to the skill itself

## Project Structure

| Folder | Purpose | Port |
|--------|---------|------|
| `OpenBB_Gemini/` | Gemini-powered AI agent (pydantic-ai + OpenBB adapter) | 8013 |
| `portfolio_review/` | Portfolio analytics backend | varies |
| `revista_api/` | Revista API backend | varies |
| `sponsor_dashboard/` | Sponsor dashboard backend | varies |
| `markets_monitor/` | Markets monitoring widgets | varies |
| `form_widgets/` | Form-based input widgets | varies |
| `propublica_api/` | ProPublica congress data widgets | varies |
| `sharepoint_widget/` | SharePoint data integration | varies |
| `deal_comparison/` | Deal comparison widgets | varies |
| `dummy_data/` | Sample CSV data (HRE properties, deals, tenants, cashflows) | — |
| `openbb_developer_skills/backends-for-openbb/` | Skill source + getting-started examples | — |

## OpenBB App Conventions

All backends follow this pattern:
- **FastAPI** with CORS allowing `https://pro.openbb.co` and `http://localhost:1420`
- **`/widgets.json`** endpoint returns a dict (NOT array) of widget configs
- **`/apps.json`** endpoint returns the dashboard layout object
- **Widget types**: `table`, `chart`, `metric`, `markdown`, `newsfeed`
- **Grid**: 40-column layout; group names must be "Group 1", "Group 2" etc.

## Gemini Agent

`OpenBB_Gemini/gemini_agent.py` — pydantic-ai Agent using `gemini-3-flash-preview`.
- Uses local patched `openbb-pydantic-ai` library from `openbb-pydantic-ai-master/`
- Custom tools: `url_reader_tool.py`, `search_tool.py`
- Env vars: `GOOGLE_API_KEY` required; `GOOGLE_CSE_ID` optional (enables web search)

## Validation Scripts

```bash
python openbb_developer_skills/backends-for-openbb/scripts/validate_widgets.py <app-folder>/
python openbb_developer_skills/backends-for-openbb/scripts/validate_apps.py <app-folder>/
python openbb_developer_skills/backends-for-openbb/scripts/validate_app.py <app-folder>/
```

## Running Apps

```bash
cd <app-folder>
pip install -r requirements.txt
uvicorn main:app --reload --port <PORT>
# Then add http://localhost:<PORT> in OpenBB: Settings → Data Connectors
```
