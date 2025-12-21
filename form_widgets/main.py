from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Literal, List, Optional
from datetime import date
import csv
import os
from pathlib import Path
import json
from functools import wraps
import asyncio

app = FastAPI(title="Salesforce Widget Backend")

# CORS Configuration
origins = [
    "https://pro.openbb.co",
    "https://pro.openbb.dev",
    "http://localhost:1420"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Widget Registry
WIDGETS = {}

def register_widget(widget_config):
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        endpoint = widget_config.get("endpoint")
        if endpoint:
            if "widgetId" not in widget_config:
                widget_config["widgetId"] = endpoint
            widget_id = widget_config["widgetId"]
            WIDGETS[widget_id] = widget_config

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator

@app.get("/widgets.json")
def get_widgets():
    return WIDGETS

@app.get("/apps.json")
async def get_apps():
    """Apps configuration file for the OpenBB Workspace"""
    return JSONResponse(
        content=json.load((Path(__file__).parent.resolve() / "apps.json").open())
    )

# CSV Files
CSV_FILE = Path(__file__).parent.resolve() / "sfs_pipeline_log.csv"
TRANCHE_FILE = Path(__file__).parent.resolve() / "tranches_log.csv"
ASSET_FILE = Path(__file__).parent.resolve() / "realestate_assets.csv"
ACCOUNTS_FILE = Path(__file__).parent.resolve() / "involved_accounts.csv"

# ==================== WIDGET 1: Deal Entry ====================
@register_widget({
    "name": "Salesforce Deal Entry",
    "description": "Submit new deals and view the SFS pipeline.",
    "type": "table",
    "endpoint": "salesforce/deals",
    "gridData": {"w": 20, "h": 10},
    "params": [
        {
            "paramName": "deal_form",
            "type": "form",
            "endpoint": "salesforce/deals",
            "inputParams": [
                {"paramName": "opportunity_name", "type": "text", "value": "", "label": "Opportunity Name"},
                {
                    "paramName": "sector",
                    "type": "text",
                    "value": "",
                    "label": "Sector",
                    "options": [
                        {"label": "🏢 Real Estate", "value": "Real Estate"},
                        {"label": "🏛️ Public Finance", "value": "Public Finance"}
                    ]
                },
                {
                    "paramName": "product",
                    "type": "text",
                    "value": "",
                    "label": "Product Type",
                    "options": [
                        {"label": "💰 Term Loan", "value": "Term Loan"},
                        {"label": "💵 Tax-Exempt Term Loan", "value": "Tax-Exempt Term Loan"},
                        {"label": "📊 Bond", "value": "Bond"},
                        {"label": "📈 Revenue Bond", "value": "Revenue Bond"}
                    ]
                },
                {
                    "paramName": "source",
                    "type": "text",
                    "value": "",
                    "label": "Lead Source",
                    "options": [
                        {"label": "🤝 Broker", "value": "Broker"},
                        {"label": "👔 Sponsor", "value": "Sponsor"},
                        {"label": "🔄 SFS Internal Referral", "value": "SFS Internal Referral"},
                        {"label": "👨‍💼 Agent", "value": "Agent"}
                    ]
                },
                {
                    "paramName": "stage",
                    "type": "text",
                    "value": "",
                    "label": "Deal Stage",
                    "options": [
                        {"label": "DI1 - Initial Contact", "value": "DI1"},
                        {"label": "DI2 - Qualification", "value": "DI2"},
                        {"label": "DI3 - Proposal", "value": "DI3"},
                        {"label": "DI4 - Negotiation", "value": "DI4"},
                        {"label": "DI5 - Due Diligence", "value": "DI5"},
                        {"label": "DI6 - Documentation", "value": "DI6"},
                        {"label": "DI7 - Approval", "value": "DI7"},
                        {"label": "DI8 - Closing", "value": "DI8"},
                        {"label": "DI9 - Complete", "value": "DI9"}
                    ]
                },
                {"paramName": "takedown_date", "type": "date", "value": "", "label": "Expected Takedown Date"},
                {"paramName": "description", "type": "text", "value": "", "label": "📋 Deal Notes"},
                {"paramName": "submit", "type": "button", "label": "✅ Submit Deal", "value": True}
            ]
        }
    ]
})
@app.get("/salesforce/deals")
async def get_salesforce_deals():
    """Returns the list of submitted deals from CSV"""
    if not CSV_FILE.exists():
        return [{"opportunity_name": None, "sector": None, "product": None, "source": None, "stage": None, "takedown_date": None, "description": None}]
    
    deals = []
    with open(CSV_FILE, mode='r', newline='') as file:
        reader = csv.DictReader(file)
        for row in reader:
            deals.append(row)
    return deals if deals else [{"opportunity_name": None, "sector": None, "product": None, "source": None, "stage": None, "takedown_date": None, "description": None}]

@app.post("/salesforce/deals")
async def submit_salesforce_deal(params: dict) -> JSONResponse:
    """Handles deal form submissions"""
    if not params.get("opportunity_name"):
        return JSONResponse(status_code=400, content={"error": "Opportunity name is required"})
    
    if not params.get("sector") or not params.get("product"):
        return JSONResponse(status_code=400, content={"error": "Sector and product are required"})
    
    params.pop("submit", None)
    file_exists = CSV_FILE.exists()
    if params.get('takedown_date'):
        params['takedown_date'] = str(params['takedown_date'])
    
    fieldnames = ["opportunity_name", "sector", "product", "source", "stage", "takedown_date", "description"]
    with open(CSV_FILE, mode='a', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
        
    return JSONResponse(content={"success": True})


# ==================== WIDGET 2: Tranche Participation ====================
@register_widget({
    "name": "💰 Tranche Participation",
    "description": "Comprehensive tranche tracking for HRE and Public Finance deals.",
    "type": "table",
    "endpoint": "salesforce/tranches",
    "gridData": {"w": 20, "h": 12},
    "params": [
        {
            "paramName": "tranche_form",
            "type": "form",
            "endpoint": "salesforce/tranches",
            "inputParams": [
                {"paramName": "tranche_name", "type": "text", "value": "", "label": "Tranche Name/Series"},
                {
                    "paramName": "facility_type",
                    "type": "text",
                    "value": "",
                    "label": "Facility Type",
                    "options": [
                        {"label": "Senior Debt", "value": "Senior Debt"},
                        {"label": "Mezzanine", "value": "Mezzanine"},
                        {"label": "Equipment Lease", "value": "Equipment Lease"},
                        {"label": "Working Capital", "value": "Working Capital"},
                        {"label": "Bond Issue", "value": "Bond Issue"}
                    ]
                },
                {
                    "paramName": "tax_status",
                    "type": "text",
                    "value": "",
                    "label": "Tax Status",
                    "options": [
                        {"label": "Tax-Exempt", "value": "Tax-Exempt"},
                        {"label": "Taxable", "value": "Taxable"},
                        {"label": "AMT", "value": "AMT"}
                    ]
                },
                {"paramName": "use_of_proceeds", "type": "text", "value": "", "label": "Use of Proceeds"},
                {"paramName": "original_principal", "type": "text", "value": "", "label": "💵 Original Principal Amount"},
                {"paramName": "current_balance", "type": "text", "value": "", "label": "Current Outstanding Balance"},
                {
                    "paramName": "rate_type",
                    "type": "text",
                    "value": "",
                    "label": "Rate Type",
                    "options": [
                        {"label": "Fixed", "value": "Fixed"},
                        {"label": "Floating", "value": "Floating"},
                        {"label": "Capped Floater", "value": "Capped Floater"}
                    ]
                },
                {"paramName": "origination_date", "type": "date", "value": "", "label": "Origination Date"},
                {"paramName": "maturity_date", "type": "date", "value": "", "label": "Maturity Date"},
                {"paramName": "submit_tranche", "type": "button", "label": "✅ Submit Tranche", "value": True}
            ]
        }
    ]
})
@app.get("/salesforce/tranches")
async def get_tranches():
    """Returns the list of tranche data"""
    if not TRANCHE_FILE.exists():
        return [{"tranche_name": None, "facility_type": None, "tax_status": None, "use_of_proceeds": None,
                 "original_principal": None, "current_balance": None, "rate_type": None, 
                 "origination_date": None, "maturity_date": None}]
    
    tranches = []
    with open(TRANCHE_FILE, mode='r', newline='') as file:
        reader = csv.DictReader(file)
        for row in reader:
            tranches.append(row)
    return tranches if tranches else [{"tranche_name": None, "facility_type": None, "tax_status": None, 
                                       "use_of_proceeds": None, "original_principal": None, "current_balance": None,
                                       "rate_type": None, "origination_date": None, "maturity_date": None}]

@app.post("/salesforce/tranches")
async def submit_tranche(params: dict) -> JSONResponse:
    """Handles tranche form submissions"""
    if not params.get("tranche_name"):
        return JSONResponse(status_code=400, content={"error": "Tranche name is required"})
    
    params.pop("submit_tranche", None)
    file_exists = TRANCHE_FILE.exists()
    
    if params.get('origination_date'):
        params['origination_date'] = str(params['origination_date'])
    if params.get('maturity_date'):
        params['maturity_date'] = str(params['maturity_date'])
    
    fieldnames = ["tranche_name", "facility_type", "tax_status", "use_of_proceeds",
                  "original_principal", "current_balance", "rate_type", 
                  "origination_date", "maturity_date"]
    with open(TRANCHE_FILE, mode='a', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
        
    return JSONResponse(content={"success": True})


# ==================== WIDGET 3: Real Estate Assets ====================
@register_widget({
    "name": "🏢 Real Estate Assets",
    "description": "Track real estate asset portfolio.",
    "type": "table",
    "endpoint": "salesforce/realestate",
    "gridData": {"w": 20, "h": 10},
    "params": [
        {
            "paramName": "realestate_form",
            "type": "form",
            "endpoint": "salesforce/realestate",
            "inputParams": [
                {"paramName": "property_name", "type": "text", "value": "", "label": "🏢 Property Name"},
                {"paramName": "property_address", "type": "text", "value": "", "label": "📍 Address"},
                {
                    "paramName": "property_type",
                    "type": "text",
                    "value": "",
                    "label": "Property Type",
                    "options": [
                        {"label": "🏢 Office", "value": "Office"},
                        {"label": "🏬 Retail", "value": "Retail"},
                        {"label": "🏭 Industrial", "value": "Industrial"},
                        {"label": "🏘️ Multifamily", "value": "Multifamily"},
                        {"label": "🏨 Hospitality", "value": "Hospitality"}
                    ]
                },
                {"paramName": "square_footage", "type": "text", "value": "", "label": "Square Footage"},
                {"paramName": "market_value", "type": "text", "value": "", "label": "💵 Market Value"},
                {"paramName": "occupancy_rate", "type": "text", "value": "", "label": "📊 Occupancy Rate"},
                {"paramName": "acquisition_date", "type": "date", "value": "", "label": "Acquisition Date"},
                {"paramName": "asset_notes", "type": "text", "value": "", "label": "📋 Asset Notes"},
                {"paramName": "submit_asset", "type": "button", "label": "✅ Submit Asset", "value": True}
            ]
        }
    ]
})
@app.get("/salesforce/realestate")
async def get_realestate():
    """Returns the list of real estate assets"""
    if not ASSET_FILE.exists():
        return [{"property_name": None, "property_address": None, "property_type": None, "square_footage": None, 
                 "market_value": None, "occupancy_rate": None, "acquisition_date": None, "asset_notes": None}]
    
    assets = []
    with open(ASSET_FILE, mode='r', newline='') as file:
        reader = csv.DictReader(file)
        for row in reader:
            assets.append(row)
    return assets if assets else [{"property_name": None, "property_address": None, "property_type": None, 
                                   "square_footage": None, "market_value": None, "occupancy_rate": None, 
                                   "acquisition_date": None, "asset_notes": None}]

@app.post("/salesforce/realestate")
async def submit_realestate(params: dict) -> JSONResponse:
    """Handles real estate asset form submissions"""
    if not params.get("property_name"):
        return JSONResponse(status_code=400, content={"error": "Property name is required"})
    
    params.pop("submit_asset", None)
    file_exists = ASSET_FILE.exists()
    if params.get('acquisition_date'):
        params['acquisition_date'] = str(params['acquisition_date'])
    
    fieldnames = ["property_name", "property_address", "property_type", "square_footage", "market_value", 
                  "occupancy_rate", "acquisition_date", "asset_notes"]
    with open(ASSET_FILE, mode='a', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
        
    return JSONResponse(content={"success": True})


# ==================== WIDGET 4: Involved Accounts (Dynamic Lookup) ====================
# This endpoint provides the list of existing accounts for the dynamic dropdown
@app.get("/salesforce/accounts/list")
async def get_accounts_list():
    """Returns list of existing accounts for dynamic dropdown lookup"""
    if not ACCOUNTS_FILE.exists():
        return []
    
    accounts = []
    with open(ACCOUNTS_FILE, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Format: "Company Name (Type)" for the dropdown
            accounts.append({
                "label": f"{row['account_name']} ({row['account_type']})",
                "value": row['account_name']
            })
    return accounts

@register_widget({
    "name": "🤝 Involved Accounts",
    "description": "Dynamic account lookup: Search existing sponsors/brokers or add new ones.",
    "type": "table",
    "endpoint": "salesforce/accounts",
    "gridData": {"w": 25, "h": 12},
    "params": [
        {
            "paramName": "account_form",
            "type": "form",
            "endpoint": "salesforce/accounts",
            "inputParams": [
                {
                    "paramName": "account_lookup",
                    "type": "endpoint",
                    "value": "",
                    "label": "🔍 Search Existing Account",
                    "description": "Start typing to search existing accounts (or leave blank to add new)",
                    "optionsEndpoint": "/salesforce/accounts/list"
                },
                {"paramName": "account_name", "type": "text", "value": "", "label": "Account / Company Name", "description": "Required for new accounts"},
                {
                    "paramName": "account_type",
                    "type": "text",
                    "value": "",
                    "label": "Account Type",
                    "options": [
                        {"label": "🏢 Sponsor / Developer", "value": "Sponsor"},
                        {"label": "🤝 Broker", "value": "Broker"},
                        {"label": "👨‍💼 Agent", "value": "Agent"},
                        {"label": "🏦 Lender Partner", "value": "Lender"},
                        {"label": "⚖️ Legal Counsel", "value": "Legal"},
                        {"label": "🏛️ Municipality", "value": "Municipality"}
                    ]
                },
                {"paramName": "primary_contact", "type": "text", "value": "", "label": "Primary Contact Name"},
                {"paramName": "contact_email", "type": "text", "value": "", "label": "📧 Contact Email"},
                {"paramName": "contact_phone", "type": "text", "value": "", "label": "📞 Contact Phone"},
                {"paramName": "business_focus", "type": "text", "value": "", "label": "Primary Business Focus", "description": "e.g., Multifamily development, Healthcare bonds"},
                {
                    "paramName": "relationship_status",
                    "type": "text",
                    "value": "",
                    "label": "Relationship Status",
                    "options": [
                        {"label": "🟢 Active", "value": "Active"},
                        {"label": "🟡 Prospective", "value": "Prospective"},
                        {"label": "🔵 Preferred Partner", "value": "Preferred"},
                        {"label": "⚪ Inactive", "value": "Inactive"}
                    ]
                },
                {"paramName": "account_notes", "type": "text", "value": "", "label": "📋 Notes"},
                {"paramName": "submit_account", "type": "button", "label": "✅ Submit Account", "value": True}
            ]
        }
    ]
})
@app.get("/salesforce/accounts")
async def get_accounts():
    """Returns the list of involved accounts"""
    if not ACCOUNTS_FILE.exists():
        return [{
            "account_name": None, "account_type": None, "primary_contact": None, 
            "contact_email": None, "contact_phone": None, "business_focus": None,
            "relationship_status": None, "account_notes": None
        }]
    
    accounts = []
    with open(ACCOUNTS_FILE, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            accounts.append(row)
    return accounts if accounts else [{
        "account_name": None, "account_type": None, "primary_contact": None,
        "contact_email": None, "contact_phone": None, "business_focus": None,
        "relationship_status": None, "account_notes": None
    }]

@app.post("/salesforce/accounts")
async def submit_account(params: dict) -> JSONResponse:
    """Handles account form submissions"""
    # If they selected from lookup dropdown, use that as the account name
    if params.get("account_lookup") and not params.get("account_name"):
        params["account_name"] = params.get("account_lookup")
    
    if not params.get("account_name"):
        return JSONResponse(status_code=400, content={"error": "Account name is required"})
    
    # Remove submit button and lookup field from saved data
    params.pop("submit_account", None)
    params.pop("account_lookup", None)  # Don't save the lookup field
    
    file_exists = ACCOUNTS_FILE.exists()
    
    fieldnames = ["account_name", "account_type", "primary_contact", "contact_email", 
                  "contact_phone", "business_focus", "relationship_status", "account_notes"]
    with open(ACCOUNTS_FILE, mode='a', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(params)
        
    return JSONResponse(content={"success": True})


# ==================== WIDGET 5: Account Lookup (Omni Widget) ====================
@register_widget({
    "name": " Account Lookup",
    "description": "Search and view all involved accounts with dynamic filtering",
    "type": "table",
    "endpoint": "salesforce/accounts/lookup",
    "gridData": {"w": 30, "h": 14},
    "params": [
        {
            "paramName": "search_term",
            "type": "text",
            "value": "",
            "label": " Search Accounts",
            "description": "Search by company name, contact name, or business focus"
        },
        {
            "paramName": "account_type_filter",
            "type": "text",
            "value": "",
            "label": "Filter by Type",
            "description": "Filter by account type",
            "options": [
                {"label": "All Types", "value": ""},
                {"label": " Sponsor", "value": "Sponsor"},
                {"label": " Broker", "value": "Broker"},
                {"label": " Agent", "value": "Agent"},
                {"label": " Lender", "value": "Lender"},
                {"label": " Legal", "value": "Legal"},
                {"label": " Municipality", "value": "Municipality"}
            ]
        },
        {
            "paramName": "relationship_filter",
            "type": "text",
            "value": "",
            "label": "Filter by Relationship",
            "options": [
                {"label": "All Statuses", "value": ""},
                {"label": " Active", "value": "Active"},
                {"label": " Prospective", "value": "Prospective"},
                {"label": " Preferred", "value": "Preferred"},
                {"label": " Inactive", "value": "Inactive"}
            ]
        }
    ]
})
@app.get("/salesforce/accounts/lookup")
async def lookup_accounts(
    search_term: str = "",
    account_type_filter: str = "",
    relationship_filter: str = ""
):
    """Lookup accounts with dynamic filtering based on params"""
    if not ACCOUNTS_FILE.exists():
        return [{"account_name": "No accounts yet", "account_type": None, "primary_contact": None, 
                 "contact_email": None, "contact_phone": None, "business_focus": None,
                 "relationship_status": None, "account_notes": None}]
    
    accounts = []
    with open(ACCOUNTS_FILE, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Apply filters
            if account_type_filter and row.get('account_type') != account_type_filter:
                continue
            if relationship_filter and row.get('relationship_status') != relationship_filter:
                continue
            
            # Apply search term across multiple fields
            if search_term:
                search_lower = search_term.lower()
                if not (
                    search_lower in row.get('account_name', '').lower() or
                    search_lower in row.get('primary_contact', '').lower() or
                    search_lower in row.get('business_focus', '').lower() or
                    search_lower in row.get('account_notes', '').lower()
                ):
                    continue
            
            accounts.append(row)
    
    return accounts if accounts else [{"account_name": "No matching accounts", "account_type": None, 
                                       "primary_contact": None, "contact_email": None, "contact_phone": None,
                                       "business_focus": None, "relationship_status": None, "account_notes": None}]
