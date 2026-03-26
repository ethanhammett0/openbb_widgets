"""Tab 6: Corporate Actions & Reference — Dividends, splits, IPOs, reference data."""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
import data_providers as dp
from universe import get_all_tickers, get_ticker_sub_sector, get_sub_sector_tickers

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/dividend_calendar")
def dividend_calendar(days_ahead:int=Query(90, ge=7, le=180), sub_sector:str=Query("All")):
    """Widget 6.1 — Dividend Calendar."""
    today = datetime.now(); future = (today+timedelta(days=days_ahead)).strftime("%Y-%m-%d"); today_s = today.strftime("%Y-%m-%d")
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    rows = []
    for t in tickers:
        try:
            for d in dp.get_dividends(t):
                ex = d.get("ex_dividend_date","")
                if ex and today_s<=ex<=future:
                    snap = dp.get_snapshot_ticker(t)
                    price = snap.get("day",{}).get("c",0) or snap.get("lastTrade",{}).get("p",0) or 1
                    cash = d.get("cash_amount",0)
                    freq = d.get("frequency",0) or 4
                    ann_yield = (cash*freq/price*100) if price>0 else 0
                    rows.append({
                        "ticker":t,"sub_sector":get_ticker_sub_sector(t),
                        "declaration_date":d.get("declaration_date",""),
                        "ex_div_date":ex,"record_date":d.get("record_date",""),
                        "pay_date":d.get("pay_date",""),
                        "cash_amount":round(cash,4),"frequency":freq,
                        "annualized_yield":round(ann_yield,2),
                    })
        except: pass
    rows.sort(key=lambda r:r.get("ex_div_date",""))
    return rows

@router.get("/split_history")
def split_history(sub_sector:str=Query("All")):
    """Widget 6.2 — Split History & Upcoming Splits."""
    today = datetime.now(); today_s = today.strftime("%Y-%m-%d")
    future_30 = (today+timedelta(days=30)).strftime("%Y-%m-%d")
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    rows = []
    for t in tickers:
        try:
            for s in dp.get_splits(t):
                exec_d = s.get("execution_date","")
                sf = s.get("split_from",1); st = s.get("split_to",1)
                flag = "🟡" if exec_d and today_s<=exec_d<=future_30 else ""
                rows.append({
                    "ticker":t,"sub_sector":get_ticker_sub_sector(t),
                    "execution_date":exec_d,"split_from":sf,"split_to":st,
                    "ratio_factor":round(st/sf,4) if sf else 1,"flag":flag,
                })
        except: pass
    rows.sort(key=lambda r:r.get("execution_date",""), reverse=True)
    return rows

@router.get("/ipo_monitor")
def ipo_monitor(since_date:str=Query(None, description="YYYY-MM-DD"),
                limit:int=Query(50, ge=10, le=100)):
    """Widget 6.3 — IPO Monitor."""
    try:
        since = since_date or (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        ipos = dp.get_ipos(since)
        rows = []
        for ipo in ipos[:limit]:
            rows.append({
                "ticker":ipo.get("ticker",""),"name":ipo.get("name",""),
                "listing_date":ipo.get("list_date",""),"market":ipo.get("market",""),
                "locale":ipo.get("locale",""),"type":ipo.get("type",""),
                "active":ipo.get("active",False),
            })
        return rows
    except Exception as e:
        logger.error(f"ipo_monitor error: {e}"); return []

@router.get("/universe_reference")
def universe_reference(sub_sector:str=Query("All")):
    """Widget 6.4 — Universe Reference Data Table."""
    tickers = get_sub_sector_tickers(sub_sector) if sub_sector != "All" else get_all_tickers()
    rows = []
    for t in tickers:
        try:
            details = dp.get_ticker_details(t)
            rows.append({
                "ticker":t,"company_name":details.get("name",""),
                "sub_sector":get_ticker_sub_sector(t),
                "exchange":details.get("primary_exchange",""),
                "currency":details.get("currency_name","USD"),
                "active":"Yes" if details.get("active") else "No",
                "sic_code":details.get("sic_code",""),
                "market_cap":details.get("market_cap",0),
            })
        except:
            rows.append({"ticker":t,"company_name":"","sub_sector":get_ticker_sub_sector(t),
                "exchange":"","currency":"USD","active":"","sic_code":"","market_cap":0})
    return rows
