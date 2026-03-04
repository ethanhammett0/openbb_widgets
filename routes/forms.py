import csv, os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Salesforce Forms"])

FORMS_DIR = Path(__file__).parent.parent / "forms_data"
CSV_FILE     = FORMS_DIR / "sfs_pipeline_log.csv"
TRANCHE_FILE = FORMS_DIR / "tranches_log.csv"
ASSET_FILE   = FORMS_DIR / "realestate_assets.csv"
ACCOUNTS_FILE= FORMS_DIR / "involved_accounts.csv"


def _read_csv(path, empty_row):
    if not path.exists():
        return [empty_row]
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows if rows else [empty_row]


def _write_csv(path, fieldnames, params):
    exists = path.exists()
    FORMS_DIR.mkdir(parents=True, exist_ok=True)
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if not exists:
            w.writeheader()
        w.writerow({k: params.get(k, "") for k in fieldnames})


# ── Deals ─────────────────────────────────────────────────────────────────────
_DEAL_FIELDS = ["opportunity_name","sector","product","source","stage","takedown_date","description"]

@router.get("/salesforce/deals")
async def get_deals():
    return _read_csv(CSV_FILE, {f: None for f in _DEAL_FIELDS})

@router.post("/salesforce/deals")
async def post_deal(params: dict):
    if not params.get("opportunity_name"):
        return JSONResponse(status_code=400, content={"error": "Opportunity name required"})
    if params.get("takedown_date"):
        params["takedown_date"] = str(params["takedown_date"])
    params.pop("submit", None)
    _write_csv(CSV_FILE, _DEAL_FIELDS, params)
    return JSONResponse(content={"success": True})


# ── Tranches ──────────────────────────────────────────────────────────────────
_TRANCHE_FIELDS = ["tranche_name","facility_type","tax_status","use_of_proceeds",
                   "original_principal","current_balance","rate_type","origination_date","maturity_date"]

@router.get("/salesforce/tranches")
async def get_tranches():
    return _read_csv(TRANCHE_FILE, {f: None for f in _TRANCHE_FIELDS})

@router.post("/salesforce/tranches")
async def post_tranche(params: dict):
    if not params.get("tranche_name"):
        return JSONResponse(status_code=400, content={"error": "Tranche name required"})
    for d in ["origination_date","maturity_date"]:
        if params.get(d): params[d] = str(params[d])
    params.pop("submit_tranche", None)
    _write_csv(TRANCHE_FILE, _TRANCHE_FIELDS, params)
    return JSONResponse(content={"success": True})


# ── Real Estate Assets ────────────────────────────────────────────────────────
_ASSET_FIELDS = ["property_name","property_address","property_type","square_footage",
                 "market_value","occupancy_rate","acquisition_date","asset_notes"]

@router.get("/salesforce/realestate")
async def get_realestate():
    return _read_csv(ASSET_FILE, {f: None for f in _ASSET_FIELDS})

@router.post("/salesforce/realestate")
async def post_realestate(params: dict):
    if not params.get("property_name"):
        return JSONResponse(status_code=400, content={"error": "Property name required"})
    if params.get("acquisition_date"): params["acquisition_date"] = str(params["acquisition_date"])
    params.pop("submit_asset", None)
    _write_csv(ASSET_FILE, _ASSET_FIELDS, params)
    return JSONResponse(content={"success": True})


# ── Accounts ──────────────────────────────────────────────────────────────────
_ACCT_FIELDS = ["account_name","account_type","primary_contact","contact_email",
                "contact_phone","business_focus","relationship_status","account_notes"]

@router.get("/salesforce/accounts/list")
async def accounts_list():
    if not ACCOUNTS_FILE.exists():
        return []
    rows = []
    with open(ACCOUNTS_FILE, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append({"label": f"{row['account_name']} ({row['account_type']})", "value": row["account_name"]})
    return rows

@router.get("/salesforce/accounts")
async def get_accounts():
    return _read_csv(ACCOUNTS_FILE, {f: None for f in _ACCT_FIELDS})

@router.post("/salesforce/accounts")
async def post_account(params: dict):
    if params.get("account_lookup") and not params.get("account_name"):
        params["account_name"] = params["account_lookup"]
    if not params.get("account_name"):
        return JSONResponse(status_code=400, content={"error": "Account name required"})
    params.pop("submit_account", None)
    params.pop("account_lookup", None)
    _write_csv(ACCOUNTS_FILE, _ACCT_FIELDS, params)
    return JSONResponse(content={"success": True})

@router.get("/salesforce/accounts/lookup")
async def lookup_accounts(search_term: str = "", account_type_filter: str = "", relationship_filter: str = ""):
    if not ACCOUNTS_FILE.exists():
        return [{"account_name": "No accounts yet", **{f: None for f in _ACCT_FIELDS[1:]}}]
    rows = []
    with open(ACCOUNTS_FILE, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if account_type_filter and row.get("account_type") != account_type_filter: continue
            if relationship_filter and row.get("relationship_status") != relationship_filter: continue
            if search_term:
                sl = search_term.lower()
                if not any(sl in row.get(k, "").lower() for k in ["account_name","primary_contact","business_focus","account_notes"]):
                    continue
            rows.append(row)
    return rows if rows else [{"account_name": "No matching accounts", **{f: None for f in _ACCT_FIELDS[1:]}}]
