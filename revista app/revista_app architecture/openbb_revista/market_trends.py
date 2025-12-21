import pandas as pd 
import aiohttp
import plotly.graph_objects as go 
from plotly.subplots import make_subplots 
import os
from .constants import REVISTA_BASE_URL

async def get_market_trends(property_id): 
    base_url = REVISTA_BASE_URL
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key: return None

    # 1. Get Location 
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{base_url}/Property/{property_id}?ApiKey={api_key}") as p_resp:
            if p_resp.status != 200: return None 
            p_raw = await p_resp.json()
            p_data = p_raw.get('value', p_raw) 
     
        # 2. Get Market Trends for CBSA 
        cbsa = p_data.get('cbsA_Code')
        if not cbsa: return None

        url = f"{base_url}/MarketTrends/{cbsa}?ApiKey={api_key}" 
        async with session.get(url) as resp:
            raw_data = await resp.json()
            data = raw_data.get('value', raw_data)
     
    if not data: return None 
    
    # Ensure data is a list for DataFrame creation
    if isinstance(data, dict):
        data = [data]
        
    df = pd.DataFrame(data) 
     
    # Create Double Axis Chart 
    fig = make_subplots(specs=[[{"secondary_y": True}]]) 
 
    # Trace 1: Occupancy (Line) - Stability Proxy 
    fig.add_trace( 
        go.Scatter( 
            x=df['quarterLabel'],  
            y=df['occupancy_TTM'],  
            name="Mkt Occupancy", 
            line=dict(color='#00F2FE', width=3), 
            hovertemplate='%{y:.1%}' # Show as % on hover 
        ), 
        secondary_y=False, 
    ) 
 
    # Trace 2: NNN Rent (Bar) - Growth Proxy 
    fig.add_trace( 
        go.Bar( 
            x=df['quarterLabel'],  
            y=df['avg_NNN_Rent'],  
            name="Avg NNN Rent", 
            marker_color='rgba(79, 172, 254, 0.3)', 
            hovertemplate='$%{y:.2f}' # Show as currency 
        ), 
        secondary_y=True, 
    ) 
 
    # Enable Rangeslider and Dynamic Interactivity 
    fig.update_layout( 
        title=f"Market Trends (CBSA: {p_data.get('cbsA_Name', cbsa)})", 
        xaxis=dict( 
            rangeslider=dict(visible=True), # <--- Adds the slider at bottom 
            type="category" 
        ), 
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1), 
        margin={"r":0,"t":40,"l":0,"b":0}, 
        hovermode="x unified" # Show all data points for a specific quarter on hover 
    ) 
    fig.update_yaxes(title_text="Occupancy %", secondary_y=False, showgrid=False) 
    fig.update_yaxes(title_text="Rent $", secondary_y=True, showgrid=False) 
 
    return fig 
