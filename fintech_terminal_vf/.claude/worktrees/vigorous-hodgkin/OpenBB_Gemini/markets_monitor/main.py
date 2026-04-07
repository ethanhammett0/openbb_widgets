from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import pandas as pd
import numpy as np
import os
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "dummy_data")

@app.get("/")
def read_root():
    return {"Info": "Markets Monitor API"}

@app.get("/widgets.json")
def get_widgets():
    import json
    with open(os.path.join(BASE_DIR, "widgets.json"), "r") as f:
        return json.load(f)

@app.get("/apps.json")
def get_apps():
    import json
    with open(os.path.join(BASE_DIR, "apps.json"), "r") as f:
        return json.load(f)

def load_data():
    deals_path = os.path.join(DATA_DIR, "hre_deals.csv")
    props_path = os.path.join(DATA_DIR, "hre_properties.csv")
    
    if not os.path.exists(deals_path) or not os.path.exists(props_path):
        raise HTTPException(status_code=500, detail="Data files not found")
        
    df_deals = pd.read_csv(deals_path)
    df_props = pd.read_csv(props_path)
    
    return df_deals, df_props

def calculate_weighted_quantile(values, weights, quantile):
    """Calculates weighted quantile."""
    try:
        df = pd.DataFrame({'val': values, 'wt': weights}).sort_values('val')
        df['cumsum_wt'] = df['wt'].cumsum()
        df['norm_cumsum'] = df['cumsum_wt'] / df['wt'].sum()
        
        # Find first value where cumulative weight exceeds quantile
        match = df[df['norm_cumsum'] >= quantile]
        if match.empty:
            return values.iloc[-1]
        return match['val'].iloc[0]
    except:
        return np.percentile(values, quantile * 100)

@app.get("/distribution")
def get_distribution(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    interval: str = Query("3 month", description="Window interval"),
    deal_type: Optional[str] = Query(None, description="Filter by deal type"),
    metric: str = Query("spread", description="Metric to visualize"),
    is_weighted: bool = Query(False, description="Whether to weight statistics by deal size")
):
    try:
        import plotly.graph_objects as go
        import json
        import re
        
        df_deals, df_props = load_data()
        
        # Parse dates
        df_deals['Closing_Date'] = pd.to_datetime(df_deals['Closing_Date'])
        
        # Filter by Date
        mask = (df_deals['Closing_Date'] >= pd.to_datetime(start_date)) & \
               (df_deals['Closing_Date'] <= pd.to_datetime(end_date))
        filtered_deals = df_deals.loc[mask].copy()
        
        # Filter by Deal Type
        if deal_type and deal_type.strip():
            filtered_deals = filtered_deals[filtered_deals['Deal_Type'].str.lower() == deal_type.lower()]
            
        if filtered_deals.empty:
            return json.loads(go.Figure().to_json())
    
        # Select Data based on Metric
        y_col = ""
        y_label = ""
        weight_col = "Aggregate_Valuation" # Default weight
        data_source = filtered_deals
        
        # Custom formatting based on metric
        y_tick_format = ""
        box_color = "#00bdd6" # Default teal
        
        if metric.lower() == "spread":
            y_col = "Spread_bps"
            y_label = "Spread (bps)"
            title_y = "Spread (bps)"
            weight_col = "Aggregate_Loan_Amount"
        elif metric.lower() == "ltv":
            y_col = "LTV"
            y_label = "LTV (%)"
            title_y = "LTV"
            y_tick_format = ".0%" 
        elif metric.lower() == "cap_rate":
            merged = pd.merge(filtered_deals, df_props, on="Deal_ID")
            data_source = merged
            y_col = "Cap_Rate"
            y_label = "Cap Rate (%)"
            title_y = "Cap Rate"
            weight_col = "Appraised_Value" # Use property value for cap rate weighting
            y_tick_format = ".2%"
        else:
            raise HTTPException(status_code=400, detail="Invalid metric")
        
        # Interval Mapping
        interval_map = {
            "1 month": "ME",
            "3 month": "3ME",
            "6 month": "6ME",
            "9 month": "9ME",
            "12 month": "12ME"
        }
        
        clean_interval = " ".join(interval.lower().split())
        freq = interval_map.get(clean_interval)
        
        if not freq:
            parts = clean_interval.split()
            if len(parts) > 0 and parts[0].isdigit():
                 freq = f"{parts[0]}ME"
            else:
                 freq = "3ME" 
    
        if 'Closing_Date' not in data_source.columns:
            return json.loads(go.Figure().to_json())
    
        # Grouper
        grouper = pd.Grouper(key='Closing_Date', freq=freq)
        grouped = data_source.groupby(grouper)
        
        x_data = [] 
        # Standard data mode
        y_data = [] 
        
        # Weighted data mode
        w_q1 = []
        w_median = []
        w_q3 = []
        w_lower = []
        w_upper = []
        
        # Determine months
        if freq == "ME":
             months = 1
        else:
             match = re.search(r'\d+', freq)
             months = int(match.group()) if match else 3
    
        for name, group in grouped:
            if not group.empty and y_col in group:
                end_d = name
                if not isinstance(end_d, pd.Timestamp):
                    continue
                start_d = (end_d - pd.DateOffset(months=months-1)).replace(day=1)
                label = f"{start_d.strftime('%b %Y')} - {end_d.strftime('%b %Y')}"
                
                valid_group = group.dropna(subset=[y_col])
                if valid_group.empty:
                    continue

                if is_weighted:
                    # Calculate weighted statistics
                    vals = valid_group[y_col]
                    wts = valid_group[weight_col] if weight_col in valid_group else pd.Series(np.ones(len(vals)))
                    
                    q1 = calculate_weighted_quantile(vals, wts, 0.25)
                    med = calculate_weighted_quantile(vals, wts, 0.50)
                    q3 = calculate_weighted_quantile(vals, wts, 0.75)
                    
                    # For whiskers, we can stick to min/max or use 5th/95th weighted
                    lower = vals.min()
                    upper = vals.max()
                    
                    x_data.append(label)
                    w_q1.append(q1)
                    w_median.append(med)
                    w_q3.append(q3)
                    w_lower.append(lower)
                    w_upper.append(upper)
                    
                else:
                    # Standard raw data points
                    for val in valid_group[y_col]:
                        x_data.append(label)
                        y_data.append(val)
                         
        fig = go.Figure()
        
        if not x_data:
             return json.loads(go.Figure().to_json())
    
        # Add Trace
        trace_params = dict(
            name=y_label,
            marker_color=box_color,
            line=dict(color=box_color, width=1.5),
            fillcolor='rgba(0,189,214,0.15)',
            width=0.5
        )

        if is_weighted:
           # Pre-computed statistics trace
           fig.add_trace(go.Box(
               x=x_data,
               q1=w_q1, 
               median=w_median, 
               q3=w_q3, 
               lowerfence=w_lower, 
               upperfence=w_upper,
               **trace_params,
               hovertemplate = (
                "<b>%{x}</b><br>" +
                f"{y_label} (Weighted Median): " + "%{median:" + y_tick_format + "}<br>" +
                "<extra></extra>"
            )
           ))
           weighted_text = " (Weighted)"
        else:
            # Raw data trace
            fig.add_trace(go.Box(
                x=x_data,
                y=y_data,
                boxpoints='outliers', 
                jitter=0.2, 
                pointpos=-1.8,
                **trace_params,
                hovertemplate = (
                "<b>%{x}</b><br>" +
                f"{y_label}: " + "%{y:" + y_tick_format + "}<br>" +
                "<extra></extra>"
            )
            ))
            weighted_text = ""
    
        fig.update_layout(
            title=dict(
                text=f"<b>{title_y} Distribution{weighted_text}</b> | {interval}",
                font=dict(size=18, family="Inter, sans-serif", color="white"),
                x=0.01,
                y=0.95
            ),
            xaxis=dict(
                type="category", 
                tickangle=0, 
                showticklabels=True,
                showgrid=False,
                tickfont=dict(color='#a0a0a0', size=11, family="Inter, sans-serif"),
                automargin=True,
                ticks="outside",
                ticklen=5,
                tickcolor='#333'
            ),
            yaxis=dict(
                tickfont=dict(color='#a0a0a0', size=11, family="Inter, sans-serif"),
                gridcolor='rgba(255,255,255,0.05)',
                zerolinecolor='rgba(255,255,255,0.1)',
                tickformat=y_tick_format
            ),
            template="plotly_dark",
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#e0e0e0", family="Inter, sans-serif"),
            showlegend=False,
            margin=dict(l=50, r=20, t=30, b=30),
            boxgap=0.3, 
            boxgroupgap=0.1
        )
        
        return json.loads(fig.to_json())
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deals/list")
def get_deals_list():
    """Returns list of deals for the highlight dropdown."""
    try:
        df_deals, _ = load_data()
        deals = df_deals[['Deal_Name', 'Deal_ID']].to_dict(orient='records')
        # Format for dropdown: {"label": "Name", "value": "ID"}
        return [{"label": d['Deal_Name'], "value": d['Deal_ID']} for d in deals]
    except Exception as e:
        return []

@app.get("/scatter")
def get_scatter(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    x_metric: str = Query(..., description="Metric for X Axis"),
    y_metric: str = Query(..., description="Metric for Y Axis"),
    deal_type: Optional[str] = Query(None, description="Filter by deal type"),
    highlight_deal: Optional[str] = Query(None, description="Deal ID to highlight"),
    is_weighted: bool = Query(False, description="Whether to size markers by deal value")
):
    try:
        import plotly.graph_objects as go
        import json
        
        df_deals, _ = load_data()
        
        # Parse dates
        df_deals['Closing_Date'] = pd.to_datetime(df_deals['Closing_Date'])
        
        # Filter by Date
        mask = (df_deals['Closing_Date'] >= pd.to_datetime(start_date)) & \
               (df_deals['Closing_Date'] <= pd.to_datetime(end_date))
        filtered = df_deals.loc[mask].copy()
        
        # Filter by Deal Type
        if deal_type and deal_type.strip():
            filtered = filtered[filtered['Deal_Type'].str.lower() == deal_type.lower()]
            
        if filtered.empty:
            return json.loads(go.Figure().to_json())

        # Metric Config Helper
        def get_metric_config(metric_name):
            m = metric_name.lower()
            if m == "spread": return "Spread_bps", "Spread (bps)", ""
            if m == "ltv": return "LTV", "LTV (%)", ".0%"
            if m == "cap_rate": return "Cap_Rate", "Cap Rate (%)", ".2%"
            if m == "ltc": return "LTC", "LTC (%)", ".0%"
            if m == "debt_yield": return "Debt_Yield", "Debt Yield (%)", ".2%"
            if m == "dscr": return "DSCR", "DSCR (x)", ".2f"
            return metric_name, metric_name, ""

        x_col, x_label, x_fmt = get_metric_config(x_metric)
        y_col, y_label, y_fmt = get_metric_config(y_metric)
        
        # Ensure columns exist (regenerate data if missing)
        if x_col not in filtered.columns or y_col not in filtered.columns:
             # Fallback or error - for now return empty to avoid crash if data file is old
             return json.loads(go.Figure().to_json())

        fig = go.Figure()
        
        # Setup Marker Sizes
        if is_weighted and 'Aggregate_Valuation' in filtered.columns:
            # Normalize valuation for bubble size (range 6 to 30)
            vals = filtered['Aggregate_Valuation']
            # Avoid div by zero
            min_v, max_v = vals.min(), vals.max()
            if max_v == min_v:
                sizes = np.full(len(vals), 12)
            else:
                sizes = 6 + ((vals - min_v) / (max_v - min_v)) * 24
            filtered['marker_size'] = sizes
        else:
            filtered['marker_size'] = 8

        # Split data for highlighting
        if highlight_deal:
             start_len = len(filtered)
             highlighted = filtered[filtered['Deal_ID'] == highlight_deal]
             # Remove highlighted from main group to avoid z-fighting/overlap
             main_group = filtered[filtered['Deal_ID'] != highlight_deal]
        else:
             main_group = filtered
             highlighted = pd.DataFrame()

        # 1. Main Scatter Trace
        fig.add_trace(go.Scatter(
            x=main_group[x_col],
            y=main_group[y_col],
            mode='markers',
            name='Market',
            text=main_group['Deal_Name'],
            hovertemplate=(
                "<b>%{text}</b><br>" +
                f"{x_label}: %{{x:{x_fmt}}}<br>" +
                f"{y_label}: %{{y:{y_fmt}}}<br>" +
                "<extra></extra>"
            ),
            marker=dict(
                color='#00bdd6',
                size=main_group['marker_size'],
                opacity=0.6,
                line=dict(width=1, color='rgba(255,255,255,0.2)')
            )
        ))

        # 2. Highlighted Trace
        if not highlighted.empty:
            # Highlighted deal gets larger size relative to its value, or fixed large
            h_size = highlighted['marker_size'].iloc[0] * 1.5 if is_weighted else 16
            
            fig.add_trace(go.Scatter(
                x=highlighted[x_col],
                y=highlighted[y_col],
                mode='markers',
                name='Selected Deal',
                text=highlighted['Deal_Name'],
                hovertemplate=(
                    "<b>%{text}</b><br>" +
                    f"{x_label}: %{{x:{x_fmt}}}<br>" +
                    f"{y_label}: %{{y:{y_fmt}}}<br>" +
                    "<extra></extra>"
                ),
                marker=dict(
                    color='#FF9F1C', # Orange highlight
                    size=h_size,
                    symbol='circle',
                    line=dict(width=2, color='white')
                )
            ))

        fig.update_layout(
            title=dict(
                text=f"<b>{y_label} vs {x_label}</b>",
                font=dict(size=18, family="Inter, sans-serif", color="white"),
                x=0.01,
                y=0.95
            ),
            xaxis=dict(
                title=dict(text=x_label, font=dict(color='#a0a0a0')),
                tickfont=dict(color='#a0a0a0', size=11, family="Inter, sans-serif"),
                gridcolor='rgba(255,255,255,0.05)',
                tickformat=x_fmt,
                zeroline=False
            ),
            yaxis=dict(
                title=dict(text=y_label, font=dict(color='#a0a0a0')),
                tickfont=dict(color='#a0a0a0', size=11, family="Inter, sans-serif"),
                gridcolor='rgba(255,255,255,0.05)',
                tickformat=y_fmt,
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
                x=1
            ),
            margin=dict(l=50, r=20, t=50, b=30),
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
