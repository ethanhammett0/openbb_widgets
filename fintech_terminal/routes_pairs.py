"""Tab 5: Pairs Lab — Themed charts + formatted outputs."""
import json, logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np, pandas as pd
import plotly.graph_objects as go
import data_providers as dp
import pairs_engine as pe
from preloader import cache
from universe import DEFAULT_PAIRS, get_ticker_sub_sector, get_all_tickers, get_sub_sector_tickers, UNIVERSE
from theme import (chart_layout, TRACE_COLORS, HEATMAP_CORR, CYAN, BULL, BEAR, WARN,
                   fmt_ratio, fmt_zscore, fmt_days, flag_zscore)

router = APIRouter()
logger = logging.getLogger(__name__)

def _parse_pair(pair_str):
    parts = pair_str.split("_")
    return (parts[0], parts[1]) if len(parts)==2 else ("V","MA")

def _get_cached_prices(ticker, lookback_days=504):
    from_d = (datetime.now()-timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    to_d = datetime.now().strftime("%Y-%m-%d")
    try:
        df = dp.get_aggregates(ticker, from_d, to_d)
        if not df.empty:
            prices = df.set_index("date")["close"]
            prices.index = pd.to_datetime(prices.index)
            return prices
    except: pass
    return pd.Series(dtype=float)


@router.get("/cointegration_results")
def cointegration_results(sub_sector:str=Query("All"),
                          pval_threshold:float=Query(0.05, ge=0.001, le=1.0),
                          lookback:int=Query(252, ge=60, le=504)):
    """Widget 5.1 — Cointegration Test Results."""
    rows = []
    pairs_to_test = DEFAULT_PAIRS
    if sub_sector!="All":
        tickers = get_sub_sector_tickers(sub_sector)
        pairs_to_test = [(a,b) for a,b in DEFAULT_PAIRS if a in tickers or b in tickers]
    for a,b in pairs_to_test:
        try:
            pa = _get_cached_prices(a, lookback); pb = _get_cached_prices(b, lookback)
            if pa.empty or pb.empty: continue
            coint = pe.test_cointegration(pa, pb)
            hr = pe.kalman_hedge_ratio(pa, pb)
            z = hr.iloc[-1]["z_score"] if not hr.empty else 0
            coint_flag = coint["cointegrated"]
            flag = "🟢" if coint_flag and abs(z)>1.5 else ("🔴" if not coint_flag else "")
            rows.append({
                "pair": f"{a} / {b}", "sub_sector": get_ticker_sub_sector(a),
                "eg_pvalue": round(coint["eg_pvalue"], 4),
                "adf_stat": round(coint["adf_stat"], 3),
                "cointegrated": "✅ Yes" if coint_flag else "❌ No",
                "hedge_ratio": fmt_ratio(hr.iloc[-1]["hedge_ratio"]) if not hr.empty else "—",
                "z_score": fmt_zscore(z),
                "flag": flag,
            })
        except Exception as e: logger.debug(f"Coint error {a}/{b}: {e}")
    return rows

@router.get("/spread_chart")
def spread_chart(pair:str=Query("V_MA"), lookback:int=Query(252, ge=10, le=504),
                 beta_mode:str=Query("kalman"), theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 5.2 — Spread Time Series with Bollinger Bands."""
    a,b = _parse_pair(pair)
    try:
        pa = _get_cached_prices(a); pb = _get_cached_prices(b)
        if pa.empty or pb.empty: return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        hr = pe.kalman_hedge_ratio(pa, pb) if "kalman" in beta_mode else pe._rolling_hedge_ratio(pa, pb)
        if hr.empty: return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        hr = hr.tail(lookback)
        if raw: return hr.reset_index().to_dict(orient="records")
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=hr.index, y=hr["spread"], mode="lines", name="Spread",
            line=dict(color=CYAN, width=2)))
        rm = hr["spread"].rolling(60).mean(); rs = hr["spread"].rolling(60).std()
        fig.add_trace(go.Scatter(x=hr.index, y=rm+2*rs, mode="lines", name="+2σ",
            line=dict(color=BEAR, dash="dash", width=1)))
        fig.add_trace(go.Scatter(x=hr.index, y=rm-2*rs, mode="lines", name="-2σ",
            line=dict(color=BULL, dash="dash", width=1)))
        fig.add_trace(go.Scatter(x=hr.index, y=rm, mode="lines", name="Mean",
            line=dict(color="rgba(148,163,184,0.3)", width=1, dash="dot")))
        fig.update_layout(**chart_layout(theme, yaxis_title="Spread"))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e: logger.error(f"spread_chart error: {e}"); return []

@router.get("/hedge_ratio_chart")
def hedge_ratio_chart(pair:str=Query("V_MA"), lookback:int=Query(252, ge=10, le=504),
                      theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 5.3 — Hedge Ratio Time Series."""
    a,b = _parse_pair(pair)
    try:
        pa = _get_cached_prices(a); pb = _get_cached_prices(b)
        if pa.empty or pb.empty: return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        kalman = pe.kalman_hedge_ratio(pa, pb)
        rolling = pe._rolling_hedge_ratio(pa, pb)
        kalman = kalman.tail(lookback); rolling = rolling.tail(lookback)
        if kalman.empty: return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
        if raw: return kalman[["hedge_ratio"]].reset_index().to_dict(orient="records")
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=kalman.index, y=kalman["hedge_ratio"], mode="lines", name="Kalman",
            line=dict(color=CYAN, width=2)))
        if not rolling.empty:
            fig.add_trace(go.Scatter(x=rolling.index, y=rolling["hedge_ratio"], mode="lines",
                name="Rolling OLS", line=dict(color=WARN, width=1.5, dash="dot")))
        fig.update_layout(**chart_layout(theme, yaxis_title="Hedge Ratio (β)"))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e: logger.error(f"hedge_ratio error: {e}"); return []

@router.get("/pair_metrics")
def pair_metrics(pair:str=Query("V_MA"), lookback:int=Query(252, ge=30, le=504),
                 beta_mode:str=Query("kalman")):
    """Widget 5.4 — Current Pair Metrics Summary (metric tiles)."""
    a,b = _parse_pair(pair)
    try:
        pa = _get_cached_prices(a, lookback); pb = _get_cached_prices(b, lookback)
        if pa.empty or pb.empty: return []
        hr = pe.kalman_hedge_ratio(pa, pb) if "kalman" in beta_mode else pe._rolling_hedge_ratio(pa, pb)
        coint = pe.test_cointegration(pa, pb)
        if hr.empty: return []
        latest = hr.iloc[-1]
        hl = pe.compute_half_life(hr["spread"])
        spreads = hr["z_score"].values
        zero_crosses = np.where(np.diff(np.sign(spreads)))[0]
        days_since = len(spreads)-1-zero_crosses[-1] if len(zero_crosses)>0 else len(spreads)
        corr_60 = pa.tail(60).corr(pb.tail(60)) if len(pa)>=60 and len(pb)>=60 else 0
        z_val = latest["z_score"]
        return [
            {"label":"Current Spread","value":f"{latest['spread']:.4f}"},
            {"label":"Z-Score","value":fmt_zscore(z_val),"delta":flag_zscore(z_val)},
            {"label":"Hedge Ratio","value":fmt_ratio(latest['hedge_ratio'])},
            {"label":"Half-Life","value":fmt_days(hl)},
            {"label":"Correlation (60d)","value":f"{corr_60:.3f}"},
            {"label":"EG p-value","value":f"{coint['eg_pvalue']:.4f}"},
            {"label":"Days Since 0-Cross","value":str(int(days_since))},
        ]
    except Exception as e: logger.error(f"pair_metrics error: {e}"); return []

@router.get("/technical_confirmation")
def technical_confirmation(pair:str=Query("V_MA"), lookback:int=Query(90, ge=30, le=252)):
    """Widget 5.5 — Technical Confirmation Panel."""
    a,b = _parse_pair(pair)
    rows = []
    for ticker in [a,b]:
        row = {"ticker":ticker}
        try:
            rsi = dp.get_rsi(ticker, 14, limit=1)
            row["rsi_14"] = f"{rsi[0]['value']:.1f}" if rsi else "—"
        except: row["rsi_14"] = "—"
        try:
            macd = dp.get_macd(ticker, limit=1)
            if macd: row["macd_signal"] = "🟢 Bullish" if (macd[0].get("histogram",0) or 0)>0 else "🔴 Bearish"
            else: row["macd_signal"] = "—"
        except: row["macd_signal"] = "—"
        try:
            sma50 = dp.get_sma(ticker,50,limit=1)
            sma200 = dp.get_sma(ticker,200,limit=1)
            snap = dp.get_snapshot_ticker(ticker)
            price = snap.get("day",{}).get("c",0) or snap.get("lastTrade",{}).get("p",0)
            row["price_vs_sma50"] = "🟢 Above" if price>(sma50[0]["value"] if sma50 else 0) else "🔴 Below"
            row["price_vs_sma200"] = "🟢 Above" if price>(sma200[0]["value"] if sma200 else 0) else "🔴 Below"
        except: row["price_vs_sma50"]="—"; row["price_vs_sma200"]="—"
        rows.append(row)
    if len(rows)==2:
        rsi_a = float(rows[0]["rsi_14"]) if rows[0]["rsi_14"]!="—" else None
        rsi_b = float(rows[1]["rsi_14"]) if rows[1]["rsi_14"]!="—" else None
        if rsi_a and rsi_b:
            if (rsi_a>70 and rsi_b<30) or (rsi_a<30 and rsi_b>70):
                rows[0]["flag"]="🟢 Divergence"; rows[1]["flag"]="🟢 Divergence"
    return rows

@router.get("/covariance_heatmap")
def covariance_heatmap(sub_sector:str=Query("All"), lookback:int=Query(252, ge=10, le=504),
                       theme:str=Query("dark"), raw:bool=Query(False)):
    """Widget 5.6 — Covariance/Correlation Matrix Heatmap."""
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector!="All" else get_all_tickers()[:20]
    rets = cache.get_multi_returns(tickers)
    if rets.empty:
        return [] if raw else JSONResponse(content=json.loads(go.Figure().to_json()))
    try:
        _, corr = pe.compute_covariance_matrix(rets)
        if corr.empty: return []
        if raw: return corr.reset_index().to_dict(orient="records")
        fig = go.Figure(go.Heatmap(z=corr.values, x=corr.columns.tolist(), y=corr.index.tolist(),
            colorscale=HEATMAP_CORR, zmid=0, zmin=-1, zmax=1,
            hovertemplate="<b>%{y}</b> vs <b>%{x}</b><br>ρ = %{z:.3f}<extra></extra>",
            colorbar=dict(tickfont=dict(size=9, color="#94A3B8"), outlinewidth=0)))
        fig.update_layout(**chart_layout(theme, margin=dict(l=80,r=60,t=10,b=80),
            height=max(400,len(corr)*22)))
        return JSONResponse(content=json.loads(fig.to_json()))
    except Exception as e: logger.error(f"cov_heatmap error: {e}"); return []
