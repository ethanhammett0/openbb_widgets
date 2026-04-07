from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import pandas as pd
import plotly.graph_objects as go
import json
from datetime import datetime, timedelta
import os

app = FastAPI()

# --- CONFIG ENDPOINTS ---
@app.get("/widgets.json")
def get_widgets():
    with open(os.path.join(os.path.dirname(__file__), "widgets.json"), "r") as f:
        return json.load(f)

@app.get("/apps.json")
def get_apps():
    with open(os.path.join(os.path.dirname(__file__), "apps.json"), "r") as f:
        return json.load(f)

# --- MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA LOADING ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "dummy_data")

def load_data():
    try:
        deals = pd.read_csv(os.path.join(DATA_DIR, "hre_deals.csv"))
        props = pd.read_csv(os.path.join(DATA_DIR, "hre_properties.csv"))
        rent_roll = pd.read_csv(os.path.join(DATA_DIR, "hre_rent_roll.csv"))
        return deals, props, rent_roll
    except FileNotFoundError:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

deals_df, props_df, rent_roll_df = load_data()

# --- HELPER FUNCTIONS ---
def project_lease_cashflow(lease_row, months=120):
    """
    Projects monthly cashflow for a single lease.
    Assumes annual escalation on anniversary.
    """
    start_date = pd.to_datetime(lease_row['Lease_Start'])
    end_date = pd.to_datetime(lease_row['Lease_Expiration'])
    
    # Base rent (monthly)
    current_rent = float(lease_row['Annual_Rent']) / 12
    escalation = float(lease_row.get('Escalation_Rate', 0.0))
    
    cashflows = []
    
    # Start projection from Jan 2025 (matching dummy data anchor)
    projection_start = datetime(2025, 1, 1)
    
    for i in range(months):
        date = projection_start + timedelta(days=32*i)
        date = date.replace(day=1)
        
        if date < start_date or date > end_date:
            amount = 0
        else:
            # Calculate escalation years passed
            years_passed = (date.year - start_date.year)
            # Adjust if we haven't hit the anniversary month yet
            if date.month < start_date.month:
                years_passed -= 1
            years_passed = max(0, years_passed)
            
            amount = current_rent * ((1 + escalation) ** years_passed)
            
        cashflows.append({
            "date": date,
            "amount": round(amount, 2),
            "series": lease_row.get('Tenant_Name', 'Unknown')
        })
        
    return cashflows

# --- ENDPOINTS ---

@app.get("/portfolios")
def get_portfolios():
    """Returns list of Portfolios."""
    if deals_df.empty:
        raise HTTPException(status_code=500, detail="Data not loaded")
        
    portfolios = deals_df[deals_df['Structure'] == 'Portfolio'][['Deal_ID', 'Deal_Name']].to_dict(orient='records')
    return [{"label": p['Deal_Name'], "value": p['Deal_ID']} for p in portfolios]

@app.get("/buildings")
def get_buildings(portfolio: Optional[str] = Query(None)):
    """Returns buildings for a specific portfolio (or all if None)."""
    if not portfolio:
        # Return ALL buildings if no portfolio filtered
        # Limit to 100 to prevent overwhelming
        filtered_props = props_df.head(100)
    else:
        filtered_props = props_df[props_df['Deal_ID'] == portfolio]
        
    result = filtered_props[['Property_ID', 'Address', 'City']].to_dict(orient='records')
    return [{"label": f"{p['Address']}, {p['City']}", "value": p['Property_ID']} for p in result]

@app.get("/cashflow")
def get_cashflow(
    portfolio: Optional[str] = Query(None, description="Portfolio ID"),
    buildings: Optional[str] = Query(None, description="Comma separated building IDs"),
    group_by_tenant: bool = Query(True, description="Group by Tenant if True, else by Building")
):
    """
    Returns aggregated cashflow area chart (Plotly JSON).
    """
    try:
        bldg_ids = []
        if buildings:
            bldg_ids = buildings.split(',')
        elif portfolio:
            # If no buildings selected, default to ALL buildings in the portfolio
            bldg_ids = props_df[props_df['Deal_ID'] == portfolio]['Property_ID'].tolist()
        
        # Handle empty selection case
        if not bldg_ids:
            return json.loads(go.Figure().update_layout(
                title=dict(
                    text="<b>Select Portfolio to View Cashflow</b>",
                    font=dict(size=18, family="Inter, sans-serif", color="white"),
                    x=0.5,
                    y=0.5,
                    xanchor='center',
                    yanchor='middle'
                ),
                template="plotly_dark",
                xaxis=dict(visible=False),
                yaxis=dict(visible=False),
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)"
            ).to_json())

        filtered_leases = rent_roll_df[rent_roll_df['Property_ID'].isin(bldg_ids)]
        
        all_cashflows = []
        
        # Project Cashflows
        for _, lease in filtered_leases.iterrows():
            series_name = lease['Tenant_Name'] if group_by_tenant else lease['Property_ID']
            cf = project_lease_cashflow(lease)
            for point in cf:
                point['series'] = series_name
                all_cashflows.append(point)
                
        df_cf = pd.DataFrame(all_cashflows)
        
        fig = go.Figure()
        
        if not df_cf.empty:
            # Aggregate
            grouped = df_cf.groupby(['date', 'series'])['amount'].sum().reset_index()
            
            # Create Traces (Stacked Area)
            series_list = grouped['series'].unique()
            
            # Sort series to ensure stable stacking
            series_list.sort()
            
            # Using a teal-based palette for series
            colors = [
                '#00bdd6', '#00a0b5', '#008394', '#006673', '#004952', 
                '#4dbd74', '#ff9f1c', '#ff5454' # Fallback accent colors
            ]
            
            for idx, s_name in enumerate(series_list):
                s_data = grouped[grouped['series'] == s_name]
                color = colors[idx % len(colors)]
                
                fig.add_trace(go.Scatter(
                    x=s_data['date'],
                    y=s_data['amount'],
                    name=s_name,
                    mode='lines',
                    stackgroup='one', # Enable stacking
                    line=dict(width=0.5, color=color),
                    fillcolor=color, # Solid fill for stacked area
                    hovertemplate = (
                        f"<b>{s_name}</b><br>" +
                        "Date: %{x|%b %Y}<br>" +
                        "Rent: $%{y:,.0f}<br>" +
                        "<extra></extra>"
                    )
                ))



        # --- MONITOR STYLE LAYOUT ---
        fig.update_layout(
            title=dict(
                text="<b>Projected Monthly Gross Rent</b>",
                font=dict(size=18, family="Inter, sans-serif", color="white"),
                x=0.01,
                y=0.95
            ),
            xaxis=dict(
                # title=dict(text="Date", font=dict(color='#a0a0a0')),
                tickfont=dict(color='#a0a0a0', size=11, family="Inter, sans-serif"),
                gridcolor='rgba(255,255,255,0.05)',
                tickformat="%b '%y",
                zeroline=False
            ),
            yaxis=dict(
                title=dict(text="Monthly Rent ($)", font=dict(color='#a0a0a0')),
                tickfont=dict(color='#a0a0a0', size=11, family="Inter, sans-serif"),
                gridcolor='rgba(255,255,255,0.05)',
                tickprefix="$",
                zeroline=False
            ),
            template="plotly_dark",
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#e0e0e0", family="Inter, sans-serif"),
            showlegend=True,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1,
                font=dict(size=10)
            ),
            margin=dict(l=60, r=20, t=50, b=30),
            hoverlabel=dict(
                bgcolor="white",
                font_size=12,
                font_family="Inter, sans-serif",
                font_color="black"
            )
        )
        
        return json.loads(fig.to_json())

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rent_roll")
def get_rent_roll_table(
    portfolio: Optional[str] = Query(None, description="Portfolio ID"),
    buildings: Optional[str] = Query(None, description="Comma separated building IDs")
):
    """
    Returns raw rent roll data (Lease terms, expirations) for Copilot analysis.
    """
    try:
        bldg_ids = []
        if buildings:
            bldg_ids = buildings.split(',')
        elif portfolio:
            bldg_ids = props_df[props_df['Deal_ID'] == portfolio]['Property_ID'].tolist()
            
        if not bldg_ids:
            return []
            
        filtered = rent_roll_df[rent_roll_df['Property_ID'].isin(bldg_ids)].copy()
        
        # Select relevant columns for analysis
        cols = [
            'Tenant_Name', 'Property_ID', 'Suite', 'Lease_Start', 
            'Lease_Expiration', 'Annual_Rent', 'Rent_PSF_Monthly', 
            'Escalation_Rate', 'Lease_Type'
        ]
        # Return as list of dicts for Table widget
        return filtered[cols].to_dict(orient='records')
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
