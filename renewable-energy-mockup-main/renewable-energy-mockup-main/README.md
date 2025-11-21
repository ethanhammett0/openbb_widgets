# Renewable Energy Project Finance Dashboard

A comprehensive FastAPI backend for OpenBB Workspace providing specialized widgets for renewable energy project finance analysis and planning.

## Features

- **Overview Dashboard**: Key metrics, project specifications, resource performance, and commercial financing widgets
- **Energy Analysis**: Power curve analysis and loss factor waterfall charts
- **Financial Projections**: Time-series financial metrics, revenue/NOI progression, and loan sizing analysis
- **Sensitivity Analysis**: Multi-scenario analysis with interactive parameters
- **Longitudinal Summary**: 20-year financial projections table

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python -m uvicorn main:app --reload --port 8000
```

## Usage

The backend provides OpenBB Workspace widgets accessible at `http://localhost:8000`. The dashboard configuration is defined in `apps.json` with multiple tabs organizing different aspects of renewable energy project finance.

## Widgets

- Renewable Energy Metrics (AgGrid table)
- Project Specifications (HTML form)
- Resource & Performance (HTML form)  
- Commercial & Financing (HTML form)
- Power Curve Analysis (AgGrid chart)
- Loss Factor Waterfall (Pivot table)
- Financial Metrics Over Time (Chart-enabled table)
- Revenue & NOI Progression (Plotly chart)
- Loan Sizing Analysis (Pivot table with multi-select)
- Sensitivity Analysis (Table and chart with scenarios)
- Longitudinal Financial Summary (20-year projections table)