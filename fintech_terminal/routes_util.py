"""Utility endpoints — dropdowns for symbols, sub-sectors, pairs, factors, cap tiers."""
import logging
from fastapi import APIRouter
import data_providers as dp
from universe import get_ticker_options, get_sub_sector_options, get_pair_options, get_factor_options, get_all_tickers

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/symbols")
def symbols():
    return get_ticker_options()

@router.get("/sub_sectors")
def sub_sectors():
    return get_sub_sector_options()

@router.get("/pairs")
def pairs():
    return get_pair_options()

@router.get("/factors")
def factors():
    return get_factor_options()

@router.get("/cap_tiers")
def cap_tiers():
    """Dynamic cap tier options derived from Polygon market cap data."""
    tiers = {"All": 0, "Large (>$10B)": 0, "Mid ($2-10B)": 0, "Small (<$2B)": 0}
    for t in get_all_tickers():
        try:
            details = dp.get_ticker_details(t)
            mc = details.get("market_cap", 0) or 0
            if mc >= 10_000_000_000:
                tiers["Large (>$10B)"] += 1
            elif mc >= 2_000_000_000:
                tiers["Mid ($2-10B)"] += 1
            else:
                tiers["Small (<$2B)"] += 1
        except Exception:
            pass
    return [{"label": f"{k} ({v})" if k != "All" else "All", "value": k} for k, v in tiers.items()]
