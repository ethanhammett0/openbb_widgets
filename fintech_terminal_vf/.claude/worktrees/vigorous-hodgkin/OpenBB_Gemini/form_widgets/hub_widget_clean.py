# This is the corrected hub widget with 3 forms as clickable buttons
# Add this to main.py after removing the corrupted hub section

@register_widget({
    "name": "📊 Salesforce Hub",
    "description": "All-in-one: Deal Entry, Tranche Participation, and Real Estate tracking with clickable form buttons.",
    "type": "table",
    "endpoint": "salesforce/hub",
    "gridData": {"w": 40, "h": 14},
    "params": [
        # FORM BUTTON 1: Deal Entry 
        {
            "paramName": "deal_form",
            "type": "form",
            "label": "Enter Deal",
            "endpoint": "salesforce/deals",
            "inputParams": [
                {"paramName": "opportunity_name", "type": "text", "value": "", "label": "Opportunity Name"},
                {
                    "paramName": "sector",
                    "type": "text",
                    "value": "Real Estate",
                    "label": "Sector",
                    "options": [
                        {"label": "🏢 Real Estate", "value": "Real Estate"},
                        {"label": "🏛️ Public Finance", "value": "Public Finance"}
                    ]
                },
                {
                    "paramName": "product",
                    "type": "text",
                    "value": "Term Loan",
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
                    "value": "Broker",
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
                    "value": "DI1",
                    "label": "Deal Stage",
                    "options": [
                        {"label": "DI1 - Initial Contact", "value": "DI1"},
                        {"label": "DI2 - Qualification", "value": "DI2"},
                        {"label": "D13 - Proposal", "value": "DI3"},
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
        },
        # FORM BUTTON 2: Tranche Participation
        {
            "paramName": "tranche_form",
            "type": "form",
            "label": "Enter Tranche",
            "endpoint": "salesforce/tranches",
            "inputParams": [
                {"paramName": "tranche_name", "type": "text", "value": "", "label": "Tranche Name/Series"},
                {
                    "paramName": "facility_type",
                    "type": "text",
                    "value": "Senior Debt",
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
                    "value": "Tax-Exempt",
                    "label": "Tax Status",
                    "options": [
                        {"label": "Tax-Exempt", "value": "Tax-Exempt"},
                        {"label": "Taxable", "value": "Taxable"},
                        {"label": "AMT", "value": "AMT"}
                    ]
                },
                {"paramName": "use_of_proceeds", "type": "text", "value": "", "label": "Use of Proceeds"},
                {"paramName": "original_principal", "type": "text", "value": "", "label": "💵 Original Principal"},
                {"paramName": "origination_date", "type": "date", "value": "", "label": "Origination Date"},
                {"paramName": "maturity_date", "type": "date", "value": "", "label": "Maturity Date"},
                {"paramName": "submit_tranche", "type": "button", "label": "✅ Submit Tranche", "value": True}
            ]
        },
        # FORM BUTTON 3: Real Estate Assets
        {
            "paramName": "realestate_form",
            "type": "form",
            "label": "Enter Asset",
            "endpoint": "salesforce/realestate",
            "inputParams": [
                {"paramName": "property_name", "type": "text", "value": "", "label": "🏢 Property Name"},
                {"paramName": "property_address", "type": "text", "value": "", "label": "📍 Address"},
                {
                    "paramName": "property_type",
                    "type": "text",
                    "value": "Office",
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
                {"paramName": "acquisition_date", "type": "date", "value": "", "label": "Acquisition Date"},
                {"paramName": "submit_asset", "type": "button", "label": "✅ Submit Asset", "value": True}
            ]
        }
    ]
})
@app.get("/salesforce/hub")
async def get_hub_data():
    """Returns combined data from all three sources"""
    deals = []
    if CSV_FILE.exists():
        with open(CSV_FILE, mode='r', newline='') as file:
            for row in csv.DictReader(file):
                row['_type'] = 'deal'
                deals.append(row)
    if TRANCHE_FILE.exists():
        with open(TRANCHE_FILE, mode='r', newline='') as file:
            for row in csv.DictReader(file):
                row['_type'] = 'tranche'
                deals.append(row)
    if ASSET_FILE.exists():
        with open(ASSET_FILE, mode='r', newline='') as file:
            for row in csv.DictReader(file):
                row['_type'] = 'asset'
                deals.append(row)
    return deals if deals else [{"_type": "No data yet"}]
