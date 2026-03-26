"""
Fintech Universe Configuration
Ticker-to-subsector mapping and utility functions.
"""

UNIVERSE = {
    "Payment Networks": ["V", "MA", "AXP", "DFS"],
    "Merchant Acquiring & POS": ["FIS", "FISV", "GPN", "PAYO", "FOUR", "COVA", "EVRI"],
    "Digital Payments & Wallets": ["PYPL", "SQ", "AFRM", "RELY", "RPAY"],
    "Payment Rails & Infrastructure": ["FLYW", "PRTH", "IMXI", "WU", "MGI", "EVTC"],
    "Alt Credit & BNPL": ["AFRM", "UPST", "FICO", "OMF", "CACC", "LPRO"],
    "Consumer Finance & Lending": ["SLM", "NAVI", "ENVA", "CURO", "LDI", "ATLC"],
    "Blockchain & Crypto": ["COIN", "MSTR", "MARA", "RIOT", "HUT", "CLSK", "CIFR"],
    "Fintech Infrastructure & SaaS": ["BILL", "NCNO", "ALKT", "OPFI", "TOST", "PAYC"],
    "Insurtech": ["LMND", "ROOT", "HIPO", "GOCO", "KINS"],
    "Neobanks & Digital Banking": ["SOFI", "DAVE", "MQ", "RELY", "SMAR"],
    "Benchmark ETFs": ["IPAY", "FINX", "XLF", "ARKF"],
}

# Pre-computed default pairs for Pairs Lab
DEFAULT_PAIRS = [
    ("V", "MA"),
    ("PYPL", "SQ"),
    ("FIS", "FISV"),
    ("AFRM", "UPST"),
    ("COIN", "MSTR"),
    ("MARA", "RIOT"),
    ("SOFI", "DAVE"),
    ("LMND", "ROOT"),
    ("BILL", "TOST"),
    ("SLM", "NAVI"),
    ("WU", "MGI"),
    ("HUT", "CLSK"),
]

# Factor proxy tickers (for constructing custom factors)
FACTOR_PROXY_TICKERS = ["TLT", "HYG", "LQD", "V", "MA", "PYPL", "IPAY", "XLF"]

# Macro panel tickers (for Widget 1.3)
MACRO_TICKERS = ["TLT", "HYG", "LQD", "XLF", "IPAY", "FINX", "ARKF"]
CRYPTO_IDS = ["bitcoin", "ethereum", "solana"]

# Factor names
FACTOR_NAMES = [
    "Mkt-RF", "SMB", "HML", "Mom", "ST-Rev",
    "Crypto-Beta", "Rate-Sensitivity", "Credit-Cycle",
    "Payments-Volume", "Fintech-vs-Bank",
]


def get_all_tickers() -> list[str]:
    """Return deduplicated flat list of all universe tickers."""
    seen = set()
    out = []
    for tickers in UNIVERSE.values():
        for t in tickers:
            if t not in seen:
                seen.add(t)
                out.append(t)
    return out


def get_sub_sectors() -> list[str]:
    """Return list of sub-sector names."""
    return list(UNIVERSE.keys())


def get_ticker_sub_sector(ticker: str) -> str:
    """Look up the primary sub-sector for a given ticker."""
    for sector, tickers in UNIVERSE.items():
        if ticker in tickers:
            return sector
    return "Unknown"


def get_sub_sector_tickers(sub_sector: str) -> list[str]:
    """Return tickers belonging to a given sub-sector."""
    return UNIVERSE.get(sub_sector, [])


def get_ticker_options() -> list[dict]:
    """Return ticker list formatted for OpenBB param dropdown."""
    return [{"label": t, "value": t} for t in get_all_tickers()]


def get_sub_sector_options() -> list[dict]:
    """Return sub-sector list formatted for OpenBB param dropdown."""
    opts = [{"label": "All", "value": "All"}]
    opts.extend({"label": s, "value": s} for s in get_sub_sectors())
    return opts


def get_pair_options() -> list[dict]:
    """Return pair list formatted for OpenBB param dropdown."""
    return [
        {"label": f"{a} / {b}", "value": f"{a}_{b}"}
        for a, b in DEFAULT_PAIRS
    ]


def get_factor_options() -> list[dict]:
    """Return factor list formatted for OpenBB param dropdown."""
    return [{"label": f, "value": f} for f in FACTOR_NAMES]
