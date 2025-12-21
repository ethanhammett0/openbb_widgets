from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from .data import REVISTA_DATA

app = FastAPI()

@app.get("/revista/sponsors")
def get_sponsors():
    """Returns unique Owner and Developer Name values."""
    sponsors = set()
    for item in REVISTA_DATA:
        if item.get("Owner"):
            sponsors.add(item["Owner"])
        if item.get("Developer Name"):
            sponsors.add(item["Developer Name"])
    
    # Format as {"label": "X", "value": "X"}
    result = [{"label": s, "value": s} for s in sorted(list(sponsors))]
    return JSONResponse(content=result)

@app.get("/revista/properties")
def get_properties(sponsor: Optional[str] = None):
    """Returns properties, optionally filtered by sponsor."""
    properties = []
    for item in REVISTA_DATA:
        # Filter by sponsor if provided
        if sponsor:
            if item.get("Owner") != sponsor and item.get("Developer Name") != sponsor:
                continue
        
        # Determine color based on status
        status_color = "black"
        if item.get("Construction Status") == "Completed":
            status_color = "green"
        elif item.get("Construction Status") in ["In Progress", "Construction"]:
            status_color = "orange"

        properties.append({
            "Property Name": item.get("Property Name"),
            "City": item.get("City"),
            "State": item.get("State Province"),
            "Construction Status": item.get("Construction Status"),
            "_Construction Status_color": status_color, # For columnColor renderFn
            "Construction Value": item.get("Construction Value Raw"), # Display raw string
            "property_id": item.get("Property ID") # Hidden ID
        })
    
    return JSONResponse(content=properties)

@app.get("/revista/scorecard")
def get_scorecard(property_id: str):
    """Returns metrics for a specific property."""
    item = next((i for i in REVISTA_DATA if i["Property ID"] == property_id), None)
    if not item:
        return JSONResponse(content={}) # Return empty if not found
    
    # Pre-lease logic
    prelease = item.get("Prelease Percent")
    prelease_delta_color = "grey"
    prelease_delta_symbol = None
    
    if prelease is not None:
        if prelease > 50:
            prelease_delta_color = "green"
            prelease_delta_symbol = "triangle-up"
        elif prelease < 20 and item.get("Construction Status") == "Completed":
            prelease_delta_color = "red"
            prelease_delta_symbol = "triangle-down"
            
    prelease_display = f"{prelease}%" if prelease is not None else "-"

    return JSONResponse(content=[
        {"name": "Construction Value", "value": item.get("Construction Value Raw") or "N/A"},
        {"name": "Expected Yield", "value": item.get("Expected Yield") or "-"},
        {
            "name": "Pre-lease %", 
            "value": prelease_display, 
            "delta_color": prelease_delta_color,
            "delta_symbol": prelease_delta_symbol
        },
        {"name": "Status", "value": item.get("Construction Status")}
    ])

@app.get("/revista/narrative")
def get_narrative(property_id: str):
    """Returns narrative for a specific property."""
    item = next((i for i in REVISTA_DATA if i["Property ID"] == property_id), None)
    if not item:
         return JSONResponse(content={"markdown": "Select a property to view details."})

    tags = item.get("Tags", "").split(",")
    tags_md = " ".join([f"**{t.strip()}**" for t in tags if t.strip()])
    
    markdown = f"""
# {item.get('Property Name')}

## Investment Highlights

{item.get('Address')}, {item.get('Primary Submarket') or ''}, {item.get('Megalopolis') or ''}.

{item.get('Description')}

---
{tags_md}
"""
    return JSONResponse(content={"markdown": markdown})

@app.get("/revista/stakeholders")
def get_stakeholders(property_id: str):
    """Returns stakeholders for a specific property."""
    item = next((i for i in REVISTA_DATA if i["Property ID"] == property_id), None)
    if not item:
        return JSONResponse(content=[])

    stakeholders = []
    if item.get("Owner"):
        stakeholders.append({"Role": "Owner", "Entity": item.get("Owner")})
    if item.get("Developer Name"):
        stakeholders.append({"Role": "Developer", "Entity": item.get("Developer Name")})
    if item.get("Contractor Name"):
        stakeholders.append({"Role": "Contractor", "Entity": item.get("Contractor Name")})
        
    return JSONResponse(content=stakeholders)
