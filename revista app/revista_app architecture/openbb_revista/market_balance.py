import pandas as pd 
import aiohttp
import plotly.graph_objects as go 
import os
from .constants import REVISTA_BASE_URL

async def get_supply_demand_gauge(property_id): 
    base_url = REVISTA_BASE_URL
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key: return None

    async with aiohttp.ClientSession() as session:
        # 1. Get Property to find CBSA Code 
        async with session.get(f"{base_url}/Property/{property_id}?ApiKey={api_key}") as p_resp:
            if p_resp.status != 200: return None 
            p_raw = await p_resp.json()
            p_data = p_raw.get('value', p_raw)
            cbsa = p_data.get('cbsA_Code') 
            
            if not cbsa: return None 
    
        # 2. Get Market Trends for CBSA 
        async with session.get(f"{base_url}/MarketTrends/{cbsa}?ApiKey={api_key}") as m_resp:
            if m_resp.status != 200: return None 
            m_raw = await m_resp.json()
            raw_list = m_raw.get('value', m_raw)
            
            if isinstance(raw_list, list) and len(raw_list) > 0:
                # Sort by date descending to get latest
                data = sorted(raw_list, key=lambda x: x.get('quarterEndDate', ''), reverse=True)[0]
            elif isinstance(raw_list, dict):
                data = raw_list
            else:
                return None 
     
    # 3. Extract Datapoints 
    # Supply = New Construction Completed TTM 
    supply_sf = data.get('constructionSF_Completed_TTM', 0) 
    # Demand = Net Absorption YoY 
    demand_sf = data.get('absorptionSF_YoY', 0) 
     
    # 4. Formulate Conclusion 
    delta = demand_sf - supply_sf 
     
    if supply_sf == 0 and demand_sf == 0: 
        status = "INACTIVE MARKET" 
        color = "#888888" 
    elif delta > 0: 
        status = "HEALTHY: DEMAND EXCEEDS SUPPLY" 
        color = "#00C851" # Green 
    elif abs(delta) < 50000: # Small margin of error 
        status = "NEUTRAL: MARKET BALANCED" 
        color = "#FFBB33" # Orange 
    else: 
        status = "RISK: MARKET OVERBUILT" 
        color = "#FF4444" # Red 
 
    # 5. Build Chart 
    fig = go.Figure() 
     
    # Supply Bar (Red-ish) 
    fig.add_trace(go.Bar( 
        x=['Square Feet'], y=[supply_sf], 
        name=f"New Supply ({supply_sf:,} SF)", 
        marker_color='#FF6B6B' 
    )) 
     
    # Demand Bar (Green-ish) 
    fig.add_trace(go.Bar( 
        x=['Square Feet'], y=[demand_sf], 
        name=f"Absorption ({demand_sf:,} SF)", 
        marker_color='#4ECDC4' 
    )) 
 
    # 6. Add Conclusion Annotation 
    fig.add_annotation( 
        x=0.5, y=1.15, # Position above chart 
        xref="paper", yref="paper", 
        text=f"<b>{status}</b>", 
        showarrow=False, 
        font=dict(size=16, color=color), 
        align="center" 
    ) 
     
    fig.add_annotation( 
        x=0.5, y=1.05, 
        xref="paper", yref="paper", 
        text=f"Net Balance: {delta:+,} SF", 
        showarrow=False, 
        font=dict(size=12, color="#888"), 
    ) 
 
    fig.update_layout( 
        title=f"Supply vs. Demand ({p_data.get('cbsA_Name', 'Metro')})", 
        barmode='group', 
        margin={"r":0,"t":80,"l":0,"b":0}, # Extra top margin for annotations 
        legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5), 
        plot_bgcolor='rgba(0,0,0,0)' # Clean background 
    ) 
    # 4. Return Plotly Figure
    import json
    return json.loads(fig.to_json())
