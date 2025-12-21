import pandas as pd 
import aiohttp
import plotly.graph_objects as go 
import re 
import os
from .constants import REVISTA_BASE_URL

async def get_benchmarker(property_id): 
    base_url = REVISTA_BASE_URL
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key: return None

    async with aiohttp.ClientSession() as session:
        # 1. Fetch Subject Property 
        async with session.get(f"{base_url}/Property/{property_id}?ApiKey={api_key}") as p_resp:
            if p_resp.status != 200: return None 
            p_data = await p_resp.json() 
     
        # 2. Fetch Market Data (5 Mile Radius) 
        async with session.get(f"{base_url}/FundamentalsByRadius/{p_data['lat']}/{p_data['lon']}/5/false?ApiKey={api_key}") as m_resp:
            m_data = await m_resp.json() # Returns a list, usually one item for the current snapshot 
            if not m_data: return None 
            market = m_data[0] 
     
    # 3. Clean & Parse Data 
    def clean_float(val): 
        if isinstance(val, (int, float)): return val 
        if not val: return 0 
        # Strip string chars like '$', '%', ',' 
        clean = re.sub(r'[^\d.]', '', str(val)) 
        try: 
            return float(clean) 
        except: 
            return 0 
 
    # Occupancy Parsing (Revista returns 0.95 or 95.0) 
    subj_occ = clean_float(p_data.get('occupancy')) 
    if subj_occ > 1: subj_occ = subj_occ / 100 # Normalize to 0.x 
     
    mkt_occ = clean_float(market.get('occupancy_ttm_Current')) 
    if mkt_occ > 1: mkt_occ = mkt_occ / 100 
 
    # Rent Parsing 
    # Note: Property often has "Asking Rent" or "PPSF" 
    # We try Asking Rent first, fallback to 0 if missing 
    subj_rent = clean_float(p_data.get('askingRent'))  
    mkt_rent = clean_float(market.get('rent_NNN_Avg')) 
 
    # 4. Build Comparison Chart 
    categories = ['Occupancy %', 'Rent $'] 
     
    # Subject Bars 
    fig = go.Figure(data=[ 
        go.Bar(name='Subject Property', x=categories, y=[subj_occ * 100, subj_rent], marker_color='#FF0055'), 
        go.Bar(name='Market Avg (5mi)', x=categories, y=[mkt_occ * 100, mkt_rent], marker_color='#555555') 
    ]) 
 
    fig.update_layout( 
        barmode='group', 
        title="Performance vs. Market Peers", 
        margin={"r":0,"t":40,"l":0,"b":0}, 
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1) 
    ) 
     
    return fig 
