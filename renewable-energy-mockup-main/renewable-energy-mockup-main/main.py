# Import required libraries
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from functools import wraps
import asyncio
import plotly.graph_objects as go


# Initialize FastAPI application with metadata
app = FastAPI(
    title="Renewable Energy Finance Backend",
    description="Backend for renewable energy project finance widgets",
    version="0.0.1"
)

# Define allowed origins for CORS (Cross-Origin Resource Sharing)
origins = [
    "https://pro.openbb.co",
    "https://pro.openbb.dev",
    "http://localhost:1420"
]

# Configure CORS middleware to handle cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_PATH = Path(__file__).parent.resolve()

@app.get("/")
def read_root():
    """Root endpoint that returns basic information about the API"""
    return {"Info": "Renewable Energy Finance API"}

# Initialize empty dictionary for widgets
WIDGETS = {}


def register_widget(widget_config):
    """
    Decorator that registers a widget configuration in the WIDGETS dictionary.
    
    Args:
        widget_config (dict): The widget configuration to add to the WIDGETS 
            dictionary. This should follow the same structure as other entries 
            in WIDGETS.
    
    Returns:
        function: The decorated function.
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Call the original function
            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Call the original function
            return func(*args, **kwargs)

        # Extract the endpoint from the widget_config
        endpoint = widget_config.get("endpoint")
        if endpoint:
            # Add an id field to the widget_config if not already present
            if "widgetId" not in widget_config:
                widget_config["widgetId"] = endpoint

            # Use id as the key to allow multiple widgets per endpoint
            widget_id = widget_config["widgetId"]
            WIDGETS[widget_id] = widget_config

        # Return the appropriate wrapper based on whether the function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator


# Endpoint that returns the registered widgets configuration
@app.get("/widgets.json")
def get_widgets():
    """Returns the configuration of all registered widgets
    
    The widgets are automatically registered through the @register_widget decorator
    and stored in the WIDGETS dictionary
    
    Returns:
        dict: The configuration of all registered widgets
    """
    return WIDGETS


# Apps configuration file for the OpenBB Workspace
@app.get("/apps.json")
def get_apps():
    """Apps configuration file for the OpenBB Workspace
    
    Returns:
        JSONResponse: The contents of apps.json file
    """
    # Read and return the apps configuration file
    return JSONResponse(
        content=json.load((Path(__file__).parent.resolve() / "apps.json").open())
    )


# Renewable Energy Project Finance Table Widget
@register_widget({
    "name": "Renewable Energy Project Finance",
    "description": "Automated power curve analysis for wind projects",
    "endpoint": "renewable_energy_metrics",
    "gridData": {
        "w": 30,
        "h": 12
    },
    "type": "table",
    "data": {
        "table": {
            "showAll": True,
            "columnsDefs": [
                {
                    "field": "metric",
                    "headerName": "Metric",
                    "cellDataType": "text",
                    "width": 200,
                    "pinned": "left"
                },
                {
                    "field": "value",
                    "headerName": "Value",
                    "cellDataType": "text",
                    "width": 150,
                    "renderFn": "greenRed"
                },
                {
                    "field": "requirement",
                    "headerName": "Requirement/Description",
                    "cellDataType": "text",
                    "width": 250
                },
                {
                    "field": "status",
                    "headerName": "Status",
                    "cellDataType": "text",
                    "width": 120
                }
            ]
        }
    }
})
@app.get("/renewable_energy_metrics")
def renewable_energy_metrics():
    """Returns renewable energy project finance metrics as table data"""
    data = [
        {
            "metric": "Max Loan Amount",
            "value": "$192mm",
            "requirement": "Constrained by LTV",
            "status": "Optimal"
        },
        {
            "metric": "Initial DSCR",
            "value": "2.14x",
            "requirement": "Min Required: 1.30x",
            "status": "Exceeds"
        },
        {
            "metric": "Debt Yield",
            "value": "11.8%",
            "requirement": "Min Required: 9.5%",
            "status": "Exceeds"
        },
        {
            "metric": "LTC Ratio",
            "value": "80%",
            "requirement": "Max Allowed: 80%",
            "status": "At Limit"
        },
        {
            "metric": "Capacity Factor",
            "value": "39.9%",
            "requirement": "Net Annual Output",
            "status": "Good"
        },
        {
            "metric": "Annual Energy",
            "value": "524k MWh/year",
            "requirement": "Net Production",
            "status": "On Target"
        }
    ]
    
    return JSONResponse(content=data)


# Power Curve Analysis Widget
@register_widget({
    "name": "Power Curve Analysis",
    "description": "Wind turbine power curve analysis",
    "endpoint": "power_curve_analysis",
    "gridData": {
        "w": 30,
        "h": 15
    },
    "type": "table",
    "data": {
        "table": {
            "enableCharts": True,
            "showAll": False,
            "chartView": {
                "enabled": True,
                "chartType": "line"
            },
            "columnsDefs": [
                {
                    "field": "wind_speed",
                    "headerName": "Wind Speed (m/s)",
                    "cellDataType": "number",
                    "chartDataType": "category",
                    "width": 150
                },
                {
                    "field": "gross_power",
                    "headerName": "Gross Power (kW)",
                    "cellDataType": "number",
                    "chartDataType": "series",
                    "formatterFn": "int",
                    "width": 150
                },
                {
                    "field": "net_power",
                    "headerName": "Net Power (kW)",
                    "cellDataType": "number",
                    "chartDataType": "series",
                    "formatterFn": "int",
                    "width": 150
                }
            ]
        }
    }
})
@app.get("/power_curve_analysis")
def power_curve_analysis():
    """Returns power curve analysis data"""
    data = [
        {"wind_speed": 0, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 1, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 2, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 3, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 4, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 5, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 6, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 7, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 8, "gross_power": 600000, "net_power": 524000},
        {"wind_speed": 9, "gross_power": 600000, "net_power": 524000}
    ]
    
    return JSONResponse(content=data)


# Loss Factor Waterfall Widget
@register_widget({
    "name": "Energy Loss Analysis (Year 1)",
    "description": "Energy losses breakdown waterfall with pivot",
    "type": "table",
    "endpoint": "loss_factor_waterfall",
    "gridData": {"w": 30, "h": 12},
    "data": {
        "table": {
            "pivotMode": True,
            "sideBar": {
                "toolPanels": [
                    {
                        "id": "columns",
                        "labelDefault": "Columns",
                        "labelKey": "columns",
                        "iconKey": "columns",
                        "toolPanel": "agColumnsToolPanel",
                    }
                ]
            },
            "columnsDefs": [
                {
                    "field": "category",
                    "headerName": "Category",
                    "enableRowGroup": True,
                    "rowGroup": True,
                    "hide": True,
                },
                {
                    "field": "item",
                    "headerName": "Energy Loss Analysis (Year 1)",
                    "cellDataType": "text",
                    "width": 350,
                },
                {
                    "field": "value",
                    "headerName": "Value",
                    "cellDataType": "number",
                    "width": 150,
                    "enableValue": True,
                    "renderFn": "greenRed"
                }
            ]
        }
    }
})
@app.get("/loss_factor_waterfall")
def loss_factor_waterfall():
    """Returns loss factor waterfall data for pivot analysis"""
    data = [
        {
            "category": "Gross Output",
            "item": "Gross Output",
            "value": 602000
        },
        {
            "category": "Gross Output",
            "item": "Availability (96.5%)",
            "value": -21000
        },
        {
            "category": "Gross Output", 
            "item": "Wake Losses (8%)",
            "value": -46000
        },
        {
            "category": "Gross Output",
            "item": "Curtailment (2%)",
            "value": -10000
        },
        {
            "item": "Net Output",
            "value": 524000
        },
        {
            "item": "Net Capacity Factor",
            "value": 39.9
        }
    ]
    
    return JSONResponse(content=data)


# Project Specifications HTML Widget
@register_widget({
    "name": "Project Specifications",
    "description": "Wind farm project technical specifications",
    "type": "html",
    "endpoint": "project_specifications",
    "gridData": {"w": 13, "h": 15},
})
@app.get("/project_specifications", response_class=HTMLResponse)
def project_specifications():
    """Returns project specifications HTML widget"""
    return HTMLResponse(content="""
<!DOCTYPE html>
<html>
<head>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #151518;
            color: #ffffff;
            padding: 12px;
            margin: 0;
        }
        .widget-container {
            background: #151518;
            border-radius: 8px;
            padding: 16px;
            height: 100%;
            display: flex;
            flex-direction: column;
            max-width: 100%;
            position: relative;
            padding-bottom: 60px;
        }
        .widget-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            color: #fb923c;
            font-size: 14px;
            font-weight: 600;
        }
        .widget-header::before {
            content: "⚡";
            font-size: 16px;
        }
        .form-group {
            margin-bottom: 12px;
        }
        .form-group label {
            display: block;
            color: #94a3b8;
            font-size: 11px;
            margin-bottom: 4px;
            font-weight: 500;
            text-transform: none;
        }
        .form-input {
            width: 100%;
            padding: 6px 10px;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            color: #ffffff;
            font-size: 13px;
            transition: all 0.2s;
        }
        .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            background: #151518;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .section-title {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 600;
            margin-top: 16px;
            margin-bottom: 12px;
            padding-top: 12px;
            border-top: 1px solid #334155;
        }
        select.form-input {
            cursor: pointer;
        }
        .update-button {
            background: transparent;
            color: #3b82f6;
            border: 1px solid #3b82f6;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            width: calc(100% - 32px);
            position: absolute;
            bottom: 16px;
            left: 16px;
            right: 16px;
            transition: all 0.2s;
        }
        .update-button:hover {
            background: #3b82f6;
            color: white;
            transform: translateY(-1px);
        }
        input[type="date"] {
            color-scheme: dark;
        }
    </style>
</head>
<body>
    <div class="widget-container">
        
        <div class="form-group">
            <label>Project Name</label>
            <input type="text" class="form-input" value="Prairie Wind Farm" />
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Nameplate (MW)</label>
                <input type="number" class="form-input" value="150" />
            </div>
            <div class="form-group">
                <label>Technology</label>
                <select class="form-input">
                    <option value="wind" selected>Wind</option>
                    <option value="solar">Solar</option>
                    <option value="hydro">Hydro</option>
                </select>
            </div>
        </div>
        
        <div class="form-group">
            <label>COD (Commercial Operation Date)</label>
            <input type="date" class="form-input" value="2025-01-06" />
        </div>
        
        <div class="form-group">
            <label>Location</label>
            <input type="text" class="form-input" value="Kansas, USA" />
        </div>
        
        <div class="section-title">Turbine Specifications</div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Hub Height (m)</label>
                <input type="number" class="form-input" value="90" />
            </div>
            <div class="form-group">
                <label>Rotor Dia (m)</label>
                <input type="number" class="form-input" value="126" />
            </div>
        </div>
        
        <button class="update-button">Update Backend</button>
    </div>
</body>
</html>
""")


# Resource & Performance HTML Widget
@register_widget({
    "name": "Resource & Performance",
    "description": "Wind resource and performance metrics",
    "type": "html",
    "endpoint": "resource_performance",
    "gridData": {"w": 13, "h": 15},
})
@app.get("/resource_performance", response_class=HTMLResponse)
def resource_performance():
    """Returns resource and performance HTML widget"""
    return HTMLResponse(content="""
<!DOCTYPE html>
<html>
<head>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #151518;
            color: #ffffff;
            padding: 12px;
            margin: 0;
        }
        .widget-container {
            background: #151518;
            border-radius: 8px;
            padding: 16px;
            height: 100%;
            display: flex;
            flex-direction: column;
            max-width: 100%;
            position: relative;
            padding-bottom: 60px;
        }
        .widget-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            color: #06b6d4;
            font-size: 14px;
            font-weight: 600;
        }
        .widget-header::before {
            content: "📊";
            font-size: 16px;
        }
        .form-group {
            margin-bottom: 12px;
        }
        .form-group label {
            display: block;
            color: #94a3b8;
            font-size: 11px;
            margin-bottom: 4px;
            font-weight: 500;
            text-transform: none;
        }
        .form-input {
            width: 100%;
            padding: 6px 10px;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            color: #ffffff;
            font-size: 13px;
            transition: all 0.2s;
        }
        .form-input:focus {
            outline: none;
            border-color: #06b6d4;
            background: #151518;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .calculated-section {
            background: #0f172a;
            border-radius: 8px;
            padding: 12px;
            margin-top: 16px;
            border: 1px solid #334155;
        }
        .calculated-title {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .calculated-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #334155;
        }
        .calculated-item:last-child {
            border-bottom: none;
        }
        .calculated-label {
            color: #94a3b8;
            font-size: 11px;
        }
        .calculated-value {
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
        }
        .calculated-value.highlight {
            color: #10b981;
        }
        .update-button {
            background: transparent;
            color: #3b82f6;
            border: 1px solid #3b82f6;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            width: calc(100% - 32px);
            position: absolute;
            bottom: 16px;
            left: 16px;
            right: 16px;
            transition: all 0.2s;
        }
        .update-button:hover {
            background: #3b82f6;
            color: white;
            transform: translateY(-1px);
        }
    </style>
</head>
<body>
    <div class="widget-container">
        
        <div class="form-group">
            <label>Avg Wind Speed (m/s)</label>
            <input type="number" step="0.1" class="form-input" value="8.5" />
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Availability (%)</label>
                <input type="number" step="0.1" class="form-input" value="96.5" />
            </div>
            <div class="form-group">
                <label>Curtailment (%)</label>
                <input type="number" step="0.1" class="form-input" value="2" />
            </div>
        </div>
        
        <div class="form-group">
            <label>Wake Losses (%)</label>
            <input type="number" step="0.1" class="form-input" value="8" />
        </div>
        
        <div class="calculated-section">
            <div class="calculated-title">Calculated Output</div>
            <div class="calculated-item">
                <span class="calculated-label">Gross Annual:</span>
                <span class="calculated-value">602k MWh</span>
            </div>
            <div class="calculated-item">
                <span class="calculated-label">Net Annual:</span>
                <span class="calculated-value highlight">524k MWh</span>
            </div>
            <div class="calculated-item">
                <span class="calculated-label">Net Capacity Factor:</span>
                <span class="calculated-value" style="color: #ffa500;">39.9%</span>
            </div>
        </div>
        
        <button class="update-button">Update Backend</button>
    </div>
</body>
</html>
""")


# Commercial & Financing HTML Widget
@register_widget({
    "name": "Commercial & Financing",
    "description": "Commercial and financing parameters",
    "type": "html",
    "endpoint": "commercial_financing",
    "gridData": {"w": 14, "h": 15},
})
@app.get("/commercial_financing", response_class=HTMLResponse)
def commercial_financing():
    """Returns commercial and financing HTML widget"""
    return HTMLResponse(content="""
<!DOCTYPE html>
<html>
<head>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #151518;
            color: #ffffff;
            padding: 12px;
            margin: 0;
        }
        .widget-container {
            background: #151518;
            border-radius: 8px;
            padding: 16px;
            height: 100%;
            display: flex;
            flex-direction: column;
            max-width: 100%;
            position: relative;
            padding-bottom: 60px;
        }
        .widget-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            color: #fbbf24;
            font-size: 14px;
            font-weight: 600;
        }
        .widget-header::before {
            content: "💰";
            font-size: 16px;
        }
        .form-group {
            margin-bottom: 12px;
        }
        .form-group label {
            display: block;
            color: #94a3b8;
            font-size: 11px;
            margin-bottom: 4px;
            font-weight: 500;
            text-transform: none;
        }
        .form-input {
            width: 100%;
            padding: 6px 10px;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            color: #ffffff;
            font-size: 13px;
            transition: all 0.2s;
        }
        .form-input:focus {
            outline: none;
            border-color: #fbbf24;
            background: #151518;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .form-row-three {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
        }
        .section-divider {
            margin: 16px 0;
            border-top: 1px solid #334155;
        }
        .total-cost-section {
            background: #0f172a;
            border-radius: 8px;
            padding: 12px;
            margin-top: 16px;
            border: 1px solid #334155;
        }
        .total-cost-label {
            color: #94a3b8;
            font-size: 11px;
            margin-bottom: 6px;
        }
        .total-cost-value {
            color: #fbbf24;
            font-size: 18px;
            font-weight: 600;
        }
        .update-button {
            background: transparent;
            color: #3b82f6;
            border: 1px solid #3b82f6;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            width: calc(100% - 32px);
            position: absolute;
            bottom: 16px;
            left: 16px;
            right: 16px;
            transition: all 0.2s;
        }
        .update-button:hover {
            background: #3b82f6;
            color: white;
            transform: translateY(-1px);
        }
        .input-prefix {
            position: relative;
        }
        .input-prefix::before {
            content: "$";
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            pointer-events: none;
            font-size: 13px;
        }
        .input-prefix input {
            padding-left: 22px;
        }
    </style>
</head>
<body>
    <div class="widget-container">
        
        <div class="form-row">
            <div class="form-group">
                <label>PPA Price ($/MWh)</label>
                <input type="number" step="1" class="form-input" value="45" />
            </div>
            <div class="form-group">
                <label>PPA Term (years)</label>
                <input type="number" step="1" class="form-input" value="20" />
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>O&M ($/kW/year)</label>
                <input type="number" step="1" class="form-input" value="25" />
            </div>
            <div class="form-group">
                <label>Land Lease ($/MW/year)</label>
                <input type="number" step="100" class="form-input" value="3500" />
            </div>
        </div>
        
        <div class="section-divider"></div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Interest Rate (%)</label>
                <input type="number" step="0.1" class="form-input" value="5.5" />
            </div>
            <div class="form-group">
                <label>Tenor (years)</label>
                <input type="number" step="1" class="form-input" value="18" />
            </div>
        </div>
        
        <div class="form-row-three">
            <div class="form-group">
                <label>Min DSCR</label>
                <input type="number" step="0.1" class="form-input" value="1.3" />
            </div>
            <div class="form-group">
                <label>Min DY (%)</label>
                <input type="number" step="0.1" class="form-input" value="9.5" />
            </div>
            <div class="form-group">
                <label>Max LTC (%)</label>
                <input type="number" step="1" class="form-input" value="80" />
            </div>
        </div>
        
        <div class="total-cost-section">
            <div class="total-cost-label">Total Project Cost ($)</div>
            <div class="total-cost-value input-prefix">
                <input type="text" class="form-input" value="240000000" style="background: transparent; border: none; color: #fbbf24; font-size: 16px; font-weight: 600; padding: 0; padding-left: 18px;" />
            </div>
        </div>
        
        <button class="update-button">Update Backend</button>
    </div>
</body>
</html>
""")


# Financial Metrics Over Time Widget
@register_widget({
    "name": "Financial Metrics Over Time",
    "description": "DSCR, Debt Yield, and Debt Balance trends",
    "endpoint": "financial_metrics_time",
    "gridData": {
        "w": 30,
        "h": 15
    },
    "type": "table",
    "data": {
        "table": {
            "enableCharts": True,
            "showAll": False,
            "chartView": {
                "enabled": True,
                "chartType": "line"
            },
            "columnsDefs": [
                {
                    "field": "year",
                    "headerName": "Year",
                    "cellDataType": "number",
                    "chartDataType": "category",
                    "width": 100
                },
                {
                    "field": "dscr",
                    "headerName": "DSCR (x)",
                    "cellDataType": "number",
                    "chartDataType": "series",
                    "formatterFn": "none",
                    "width": 120
                },
                {
                    "field": "debt_yield",
                    "headerName": "Debt Yield (%)",
                    "cellDataType": "number",
                    "chartDataType": "series",
                    "formatterFn": "none",
                    "width": 140
                },
                {
                    "field": "debt_balance",
                    "headerName": "Debt Balance ($mm)",
                    "cellDataType": "number",
                    "chartDataType": "series",
                    "formatterFn": "int",
                    "width": 160
                },
                {
                    "field": "min_dscr",
                    "headerName": "Min DSCR Required",
                    "cellDataType": "number",
                    "chartDataType": "series",
                    "formatterFn": "none",
                    "width": 160
                }
            ]
        }
    }
})
@app.get("/financial_metrics_time")
def financial_metrics_time():
    """Returns financial metrics over time data"""
    data = [
        {"year": 0, "dscr": 2.8, "debt_yield": 11.8, "debt_balance": 192, "min_dscr": 1.3},
        {"year": 1, "dscr": 2.14, "debt_yield": 11.9, "debt_balance": 185, "min_dscr": 1.3},
        {"year": 2, "dscr": 2.12, "debt_yield": 12.1, "debt_balance": 178, "min_dscr": 1.3},
        {"year": 3, "dscr": 2.11, "debt_yield": 12.3, "debt_balance": 171, "min_dscr": 1.3},
        {"year": 4, "dscr": 2.09, "debt_yield": 12.5, "debt_balance": 164, "min_dscr": 1.3},
        {"year": 5, "dscr": 2.08, "debt_yield": 12.7, "debt_balance": 156, "min_dscr": 1.3},
        {"year": 6, "dscr": 2.06, "debt_yield": 12.9, "debt_balance": 148, "min_dscr": 1.3},
        {"year": 7, "dscr": 2.04, "debt_yield": 13.1, "debt_balance": 141, "min_dscr": 1.3},
        {"year": 8, "dscr": 2.02, "debt_yield": 13.3, "debt_balance": 133, "min_dscr": 1.3},
        {"year": 9, "dscr": 2.00, "debt_yield": 13.5, "debt_balance": 125, "min_dscr": 1.3},
        {"year": 10, "dscr": 1.98, "debt_yield": 13.7, "debt_balance": 117, "min_dscr": 1.3},
        {"year": 11, "dscr": 1.96, "debt_yield": 13.9, "debt_balance": 108, "min_dscr": 1.3},
        {"year": 12, "dscr": 1.94, "debt_yield": 14.1, "debt_balance": 100, "min_dscr": 1.3},
        {"year": 13, "dscr": 1.92, "debt_yield": 14.3, "debt_balance": 91, "min_dscr": 1.3},
        {"year": 14, "dscr": 1.90, "debt_yield": 14.5, "debt_balance": 83, "min_dscr": 1.3},
        {"year": 15, "dscr": 1.88, "debt_yield": 14.7, "debt_balance": 74, "min_dscr": 1.3},
        {"year": 16, "dscr": 1.86, "debt_yield": 14.9, "debt_balance": 65, "min_dscr": 1.3},
        {"year": 17, "dscr": 1.84, "debt_yield": 15.1, "debt_balance": 56, "min_dscr": 1.3},
        {"year": 18, "dscr": 0, "debt_yield": 0, "debt_balance": 0, "min_dscr": 1.3}
    ]
    
    return JSONResponse(content=data)


# Revenue & NOI Progression Widget
@register_widget({
    "name": "Revenue & NOI Progression",
    "description": "Revenue and Net Operating Income trends over time",
    "endpoint": "revenue_noi_progression",
    "gridData": {
        "w": 30,
        "h": 15
    },
    "type": "chart",
    "raw": True
})
@app.get("/revenue_noi_progression")
def revenue_noi_progression(raw: bool = False, theme: str = "dark"):
    """Returns revenue and NOI progression data as Plotly chart"""
    
    # Data based on the image showing revenue and NOI progression
    years = list(range(0, 19))
    revenue = [23580000 + (i * 180000) for i in years]  # Starting at ~$23.58M, increasing yearly
    noi = [21200000 + (i * 170000) for i in years]      # Starting at ~$21.2M, increasing yearly
    
    # Raw data for AI/copilot understanding
    if raw:
        data = []
        for i, year in enumerate(years):
            data.append({
                "year": year,
                "revenue": revenue[i],
                "noi": noi[i]
            })
        return data
    
    # Theme colors
    if theme == "dark":
        bg_color = "#151518"
        text_color = "#ffffff"
        grid_color = "rgba(255, 255, 255, 0.1)"
        revenue_color = "#10b981"  # Green
        noi_color = "#3b82f6"     # Blue
    else:
        bg_color = "#ffffff"
        text_color = "#333333"
        grid_color = "rgba(0, 0, 0, 0.1)"
        revenue_color = "#059669"  # Darker green for light theme
        noi_color = "#2563eb"     # Darker blue for light theme
    
    # Create Plotly figure
    fig = go.Figure()
    
    # Add revenue line
    fig.add_trace(go.Scatter(
        x=years,
        y=revenue,
        mode='lines+markers',
        name='Revenue',
        line=dict(color=revenue_color, width=3),
        marker=dict(color=revenue_color, size=6),
        hovertemplate='<b>Revenue</b><br>Year: %{x}<br>Amount: $%{y:,.0f}<extra></extra>'
    ))
    
    # Add NOI line  
    fig.add_trace(go.Scatter(
        x=years,
        y=noi,
        mode='lines+markers',
        name='NOI',
        line=dict(color=noi_color, width=3),
        marker=dict(color=noi_color, size=6),
        hovertemplate='<b>NOI</b><br>Year: %{x}<br>Amount: $%{y:,.0f}<extra></extra>'
    ))
    
    # Update layout to match the image style
    fig.update_layout(
        title={
            'text': "Revenue & NOI Progression",
            'x': 0.5,
            'y': 0.95,
            'xanchor': 'center',
            'yanchor': 'top',
            'font': {'size': 18, 'color': text_color}
        },
        xaxis=dict(
            title="Year",
            gridcolor=grid_color,
            tickfont=dict(color=text_color),
            titlefont=dict(color=text_color),
            showgrid=True,
            zeroline=False,
            range=[-0.5, 18.5]
        ),
        yaxis=dict(
            title="Amount ($)",
            gridcolor=grid_color,
            tickfont=dict(color=text_color),
            titlefont=dict(color=text_color),
            tickformat="$,.0f",
            showgrid=True,
            zeroline=True,
            zerolinecolor=grid_color,
            range=[0, 32000000]  # Set range to match the image
        ),
        plot_bgcolor=bg_color,
        paper_bgcolor=bg_color,
        font=dict(color=text_color),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="center",
            x=0.5,
            font=dict(color=text_color),
            bgcolor="rgba(0,0,0,0)"
        ),
        margin=dict(l=80, r=40, t=80, b=60),
        hovermode='x unified'
    )
    
    # Convert to JSON and add config
    figure_json = json.loads(fig.to_json())
    figure_json['config'] = {
        'displaylogo': False,
        'modeBarButtonsToRemove': ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
        'responsive': True
    }
    
    return figure_json


# Loan Sizing Analysis Widget
@register_widget({
    "name": "Loan Sizing Analysis",
    "description": "Analysis of loan constraints and final loan sizing",
    "endpoint": "loan_sizing_analysis",
    "gridData": {
        "w": 60,
        "h": 12
    },
    "type": "table",
    "data": {
        "table": {
            "pivotMode": True,
            "sideBar": {
                "toolPanels": [
                    {
                        "id": "columns",
                        "labelDefault": "Columns",
                        "labelKey": "columns",
                        "iconKey": "columns",
                        "toolPanel": "agColumnsToolPanel",
                    }
                ]
            },
            "columnsDefs": [
                {
                    "field": "constraint_type",
                    "headerName": "Constraint Type",
                    "enableRowGroup": True,
                    "rowGroup": True,
                    "hide": True,
                },
                {
                    "field": "metric",
                    "headerName": "Metric",
                    "cellDataType": "text",
                    "width": 200,
                },
                {
                    "field": "value",
                    "headerName": "Value",
                    "cellDataType": "text",
                    "width": 150,
                    "enableValue": True
                }
            ]
        }
    }
})
@app.get("/loan_sizing_analysis")
def loan_sizing_analysis():
    """Returns loan sizing analysis data for pivot analysis"""
    data = [
        # DSCR Constraint
        {"constraint_type": "By DSCR Constraint", "metric": "Year 1 NOI", "value": "$22.7mm"},
        {"constraint_type": "By DSCR Constraint", "metric": "Min DSCR", "value": "1.30x"},
        {"constraint_type": "By DSCR Constraint", "metric": "Interest Rate", "value": "5.5%"},
        {"constraint_type": "By DSCR Constraint", "metric": "Max Loan", "value": "$317mm"},
        
        # Debt Yield Constraint
        {"constraint_type": "By Debt Yield Constraint", "metric": "Year 1 NOI", "value": "$22.7mm"},
        {"constraint_type": "By Debt Yield Constraint", "metric": "Min Debt Yield", "value": "9.5%"},
        {"constraint_type": "By Debt Yield Constraint", "metric": "Max Loan", "value": "$238mm"},
        
        # LTC Constraint
        {"constraint_type": "By LTC Constraint", "metric": "Project Cost", "value": "$240mm"},
        {"constraint_type": "By LTC Constraint", "metric": "Max LTC", "value": "80%"},
        {"constraint_type": "By LTC Constraint", "metric": "Max Loan", "value": "$192mm"},
        
        # Final Loan Size
        {"constraint_type": "Final Loan Size", "metric": "Constraining Factor", "value": "LTC"},
        {"constraint_type": "Final Loan Size", "metric": "LTC Ratio", "value": "80%"},
        {"constraint_type": "Final Loan Size", "metric": "Loan Amount", "value": "$192mm"},
        {"constraint_type": "Final Loan Size", "metric": "Annual Debt Service", "value": "$10.6mm"}
    ]
    
    return JSONResponse(content=data)


# Sensitivity Analysis Widget
@register_widget({
    "name": "Sensitivity Analysis",
    "description": "Sensitivity analysis across different scenarios",
    "endpoint": "sensitivity_analysis",
    "gridData": {
        "w": 40,
        "h": 12
    },
    "type": "table",
    "params": [
        {
            "paramName": "scenario",
            "description": "Select scenario for sensitivity analysis",
            "value": "P50 (Base Case)",
            "label": "Scenario",
            "type": "text",
            "multiSelect": True,
            "options": [
                {"label": "P50 (Base Case)", "value": "P50 (Base Case)"},
                {"label": "P75 (Conservative)", "value": "P75 (Conservative)"},
                {"label": "P90 (Stress)", "value": "P90 (Stress)"}
            ]
        }
    ],
    "data": {
        "table": {
            "showAll": True,
            "columnsDefs": [
                {
                    "field": "metric",
                    "headerName": "Metric",
                    "cellDataType": "text",
                    "width": 150,
                    "pinned": "left"
                },
                {
                    "field": "p50_base_case",
                    "headerName": "P50 (Base Case)",
                    "cellDataType": "text",
                    "width": 150,
                    "renderFn": "greenRed"
                },
                {
                    "field": "p75_conservative",
                    "headerName": "P75 (Conservative)",
                    "cellDataType": "text",
                    "width": 180,
                    "renderFn": "greenRed"
                },
                {
                    "field": "p90_stress",
                    "headerName": "P90 (Stress)",
                    "cellDataType": "text",
                    "width": 150,
                    "renderFn": "greenRed"
                }
            ]
        }
    }
})
@app.get("/sensitivity_analysis")
def sensitivity_analysis(scenario: str = "P50 (Base Case)"):
    """Returns sensitivity analysis data with dynamic columns based on selected scenarios"""
    
    # Parse the multi-select parameter (comma-separated values)
    selected_scenarios = [s.strip() for s in scenario.split(",")]
    
    # Full dataset with standardized field names
    full_data = [
        {
            "metric": "Resource",
            "p50_base_case": "100%",
            "p75_conservative": "90%",
            "p90_stress": "80%"
        },
        {
            "metric": "PPA Price", 
            "p50_base_case": "100%",
            "p75_conservative": "95%",
            "p90_stress": "85%"
        },
        {
            "metric": "CapEx",
            "p50_base_case": "100%",
            "p75_conservative": "105%",
            "p90_stress": "115%"
        },
        {
            "metric": "Max Loan",
            "p50_base_case": "$192mm",
            "p75_conservative": "$190mm",
            "p90_stress": "$136mm"
        },
        {
            "metric": "DSCR",
            "p50_base_case": "2.14x",
            "p75_conservative": "1.73x",
            "p90_stress": "1.73x"
        },
        {
            "metric": "LTC",
            "p50_base_case": "80%",
            "p75_conservative": "75.2%",
            "p90_stress": "49.3%"
        }
    ]
    
    # Map scenario names to field names
    scenario_field_map = {
        "P50 (Base Case)": "p50_base_case",
        "P75 (Conservative)": "p75_conservative", 
        "P90 (Stress)": "p90_stress"
    }
    
    # Filter data to only include selected scenario columns
    filtered_data = []
    for row in full_data:
        filtered_row = {"metric": row["metric"]}
        for scenario_name in selected_scenarios:
            field_name = scenario_field_map.get(scenario_name)
            if field_name and field_name in row:
                filtered_row[field_name] = row[field_name]
        filtered_data.append(filtered_row)
    
    return JSONResponse(content=filtered_data)


# Sensitivity Analysis Chart Widget
@register_widget({
    "name": "Sensitivity Analysis Chart",
    "description": "Chart visualization of sensitivity analysis across scenarios",
    "endpoint": "sensitivity_analysis_chart",
    "gridData": {
        "w": 40,
        "h": 15
    },
    "type": "chart",
    "raw": True,
    "params": [
        {
            "paramName": "scenario",
            "description": "Select scenario for sensitivity analysis",
            "value": "P50 (Base Case)",
            "label": "Scenario",
            "type": "text",
            "multiSelect": True,
            "options": [
                {"label": "P50 (Base Case)", "value": "P50 (Base Case)"},
                {"label": "P75 (Conservative)", "value": "P75 (Conservative)"},
                {"label": "P90 (Stress)", "value": "P90 (Stress)"}
            ]
        }
    ]
})
@app.get("/sensitivity_analysis_chart")
def sensitivity_analysis_chart(scenario: str = "P50 (Base Case)", raw: bool = False, theme: str = "dark"):
    """Returns sensitivity analysis chart visualization"""
    
    # Parse the multi-select parameter (comma-separated values)
    selected_scenarios = [s.strip() for s in scenario.split(",")]
    
    # Sample data for Max Loan values (in millions)
    scenario_data = {
        "P50 (Base Case)": {"value": 192, "color": "#FF8000"},
        "P75 (Conservative)": {"value": 190, "color": "#FF8000"},
        "P90 (Stress)": {"value": 136, "color": "#FF8000"}
    }
    
    # Raw data for AI/copilot understanding
    if raw:
        data = []
        for scenario_name in selected_scenarios:
            if scenario_name in scenario_data:
                data.append({
                    "scenario": scenario_name,
                    "max_loan_mm": scenario_data[scenario_name]["value"]
                })
        return data
    
    # Theme colors
    if theme == "dark":
        bg_color = "#151518"
        text_color = "#ffffff"
        grid_color = "rgba(255, 255, 255, 0.1)"
        bar_color = "#FF8000"  # Orange like in the image
    else:
        bg_color = "#ffffff"
        text_color = "#333333"
        grid_color = "rgba(0, 0, 0, 0.1)"
        bar_color = "#FF6600"  # Darker orange for light theme
    
    # Create Plotly figure
    fig = go.Figure()
    
    # Add bars for selected scenarios
    scenarios = []
    values = []
    colors = []
    
    for scenario_name in selected_scenarios:
        if scenario_name in scenario_data:
            scenarios.append(scenario_name)
            values.append(scenario_data[scenario_name]["value"])
            colors.append(bar_color)
    
    fig.add_trace(go.Bar(
        x=scenarios,
        y=values,
        marker=dict(color=colors),
        hovertemplate='<b>%{x}</b><br>Max Loan: $%{y}mm<extra></extra>',
        showlegend=False
    ))
    
    # Update layout to match the image style
    fig.update_layout(
        title={
            'text': "Max Loan by Scenario",
            'x': 0.5,
            'y': 0.95,
            'xanchor': 'center',
            'yanchor': 'top',
            'font': {'size': 18, 'color': text_color}
        },
        xaxis=dict(
            title="Scenario",
            gridcolor=grid_color,
            tickfont=dict(color=text_color),
            titlefont=dict(color=text_color),
            showgrid=False,
            zeroline=False
        ),
        yaxis=dict(
            title="Max Loan ($mm)",
            gridcolor=grid_color,
            tickfont=dict(color=text_color),
            titlefont=dict(color=text_color),
            tickformat=".0f",
            showgrid=True,
            zeroline=True,
            zerolinecolor=grid_color,
            range=[0, 220]  # Set range to match the image
        ),
        plot_bgcolor=bg_color,
        paper_bgcolor=bg_color,
        font=dict(color=text_color),
        margin=dict(l=80, r=40, t=80, b=60),
        hovermode='x'
    )
    
    # Convert to JSON and add config
    figure_json = json.loads(fig.to_json())
    figure_json['config'] = {
        'displaylogo': False,
        'modeBarButtonsToRemove': ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
        'responsive': True
    }
    
    return figure_json# Longitudinal Financial Summary Widget
@register_widget({
    "name": "Longitudinal Financial Summary",
    "description": "20-year financial projections and key metrics summary",
    "endpoint": "longitudinal_financial_summary",
    "gridData": {
        "w": 60,
        "h": 20
    },
    "type": "table",
    "data": {
        "table": {
            "showAll": True,
            "columnsDefs": [
                {
                    "field": "year",
                    "headerName": "Year",
                    "cellDataType": "text",
                    "width": 80,
                    "pinned": "left"
                },
                {
                    "field": "net_mwh",
                    "headerName": "Net MWh",
                    "cellDataType": "text",
                    "width": 100
                },
                {
                    "field": "revenue",
                    "headerName": "Revenue",
                    "cellDataType": "text",
                    "width": 110,
                    "renderFn": "greenRed"
                },
                {
                    "field": "opex",
                    "headerName": "OpEx",
                    "cellDataType": "text",
                    "width": 100,
                    "renderFn": "greenRed"
                },
                {
                    "field": "noi",
                    "headerName": "NOI",
                    "cellDataType": "text",
                    "width": 110,
                    "renderFn": "greenRed"
                },
                {
                    "field": "debt_service",
                    "headerName": "Debt Service",
                    "cellDataType": "text",
                    "width": 120
                },
                {
                    "field": "dscr",
                    "headerName": "DSCR",
                    "cellDataType": "text",
                    "width": 80,
                    "renderFn": "greenRed"
                },
                {
                    "field": "debt_yield",
                    "headerName": "Debt Yield",
                    "cellDataType": "text",
                    "width": 100,
                    "renderFn": "greenRed"
                },
                {
                    "field": "ltv",
                    "headerName": "LTV",
                    "cellDataType": "text",
                    "width": 80,
                    "renderFn": "greenRed"
                }
            ]
        }
    }
})
@app.get("/longitudinal_financial_summary")
def longitudinal_financial_summary():
    """Returns longitudinal financial summary data"""
    data = [
        {"year": "0", "net_mwh": "524k", "revenue": "$23.6mm", "opex": "$929k", "noi": "$22.7mm", "debt_service": "$10.6mm", "dscr": "2.14x", "debt_yield": "11.8%", "ltv": "80%"},
        {"year": "1", "net_mwh": "524k", "revenue": "$23.9mm", "opex": "$952k", "noi": "$23.0mm", "debt_service": "$10.6mm", "dscr": "2.18x", "debt_yield": "12%", "ltv": "66.8%"},
        {"year": "2", "net_mwh": "524k", "revenue": "$24.3mm", "opex": "$976k", "noi": "$23.3mm", "debt_service": "$10.6mm", "dscr": "2.21x", "debt_yield": "12.1%", "ltv": "65.9%"},
        {"year": "3", "net_mwh": "524k", "revenue": "$24.7mm", "opex": "$1.00mm", "noi": "$23.7mm", "debt_service": "$10.6mm", "dscr": "2.24x", "debt_yield": "12.3%", "ltv": "64.9%"},
        {"year": "4", "net_mwh": "524k", "revenue": "$25.0mm", "opex": "$1.03mm", "noi": "$24.0mm", "debt_service": "$10.6mm", "dscr": "2.27x", "debt_yield": "12.5%", "ltv": "64%"},
        {"year": "5", "net_mwh": "524k", "revenue": "$25.4mm", "opex": "$1.05mm", "noi": "$24.4mm", "debt_service": "$10.6mm", "dscr": "2.31x", "debt_yield": "12.7%", "ltv": "63.1%"},
        {"year": "6", "net_mwh": "524k", "revenue": "$25.8mm", "opex": "$1.08mm", "noi": "$24.7mm", "debt_service": "$10.6mm", "dscr": "2.34x", "debt_yield": "12.9%", "ltv": "62.2%"},
        {"year": "7", "net_mwh": "524k", "revenue": "$26.2mm", "opex": "$1.10mm", "noi": "$25.1mm", "debt_service": "$10.6mm", "dscr": "2.37x", "debt_yield": "13.1%", "ltv": "61.3%"},
        {"year": "8", "net_mwh": "524k", "revenue": "$26.6mm", "opex": "$1.13mm", "noi": "$25.4mm", "debt_service": "$10.6mm", "dscr": "2.41x", "debt_yield": "13.2%", "ltv": "60.4%"},
        {"year": "9", "net_mwh": "524k", "revenue": "$27.0mm", "opex": "$1.16mm", "noi": "$25.8mm", "debt_service": "$10.6mm", "dscr": "2.44x", "debt_yield": "13.4%", "ltv": "59.5%"},
        {"year": "10", "net_mwh": "524k", "revenue": "$27.4mm", "opex": "$1.19mm", "noi": "$26.2mm", "debt_service": "$10.6mm", "dscr": "2.48x", "debt_yield": "13.6%", "ltv": "58.7%"},
        {"year": "11", "net_mwh": "524k", "revenue": "$27.8mm", "opex": "$1.22mm", "noi": "$26.6mm", "debt_service": "$10.6mm", "dscr": "2.51x", "debt_yield": "13.8%", "ltv": "57.8%"},
        {"year": "12", "net_mwh": "524k", "revenue": "$28.2mm", "opex": "$1.25mm", "noi": "$26.9mm", "debt_service": "$10.6mm", "dscr": "2.55x", "debt_yield": "14%", "ltv": "57%"},
        {"year": "13", "net_mwh": "524k", "revenue": "$28.6mm", "opex": "$1.28mm", "noi": "$27.3mm", "debt_service": "$10.6mm", "dscr": "2.59x", "debt_yield": "14.2%", "ltv": "56.2%"},
        {"year": "14", "net_mwh": "524k", "revenue": "$29.0mm", "opex": "$1.31mm", "noi": "$27.7mm", "debt_service": "$10.6mm", "dscr": "2.63x", "debt_yield": "14.4%", "ltv": "55.4%"},
        {"year": "15", "net_mwh": "524k", "revenue": "$29.5mm", "opex": "$1.35mm", "noi": "$28.1mm", "debt_service": "$10.6mm", "dscr": "2.66x", "debt_yield": "14.7%", "ltv": "54.6%"},
        {"year": "16", "net_mwh": "524k", "revenue": "$29.9mm", "opex": "$1.38mm", "noi": "$28.5mm", "debt_service": "$10.6mm", "dscr": "2.70x", "debt_yield": "14.9%", "ltv": "53.8%"},
        {"year": "17", "net_mwh": "524k", "revenue": "$30.4mm", "opex": "$1.41mm", "noi": "$29.0mm", "debt_service": "$10.6mm", "dscr": "2.74x", "debt_yield": "15.1%", "ltv": "53%"},
        {"year": "18 (Maturity)", "net_mwh": "524k", "revenue": "$30.8mm", "opex": "$1.45mm", "noi": "$29.4mm", "debt_service": "$0.00", "dscr": "-", "debt_yield": "-", "ltv": "-"},
        {"year": "19", "net_mwh": "524k", "revenue": "$31.3mm", "opex": "$1.48mm", "noi": "$29.8mm", "debt_service": "$0.00", "dscr": "-", "debt_yield": "-", "ltv": "-"}
    ]
    
    return JSONResponse(content=data)