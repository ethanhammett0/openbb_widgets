"""Diagnose factor pipeline failures."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

import data_providers as dp
import pandas as pd

print("=== Step 1: Ken French Data ===")
try:
    ff = dp.get_french_factors()
    print(f"  Shape: {ff.shape}")
    print(f"  Columns: {list(ff.columns)}")
    print(f"  Index type: {type(ff.index)}")
    if not ff.empty:
        print(f"  Date range: {ff.index[0]} to {ff.index[-1]}")
        print(f"  Sample:\n{ff.tail(3)}")
    else:
        print("  ❌ EMPTY - this is the root cause")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n=== Step 2: CoinGecko Crypto Returns ===")
try:
    cr = dp.get_crypto_daily_returns(days=180)
    print(f"  Shape: {cr.shape}")
    if not cr.empty:
        print(f"  Columns: {list(cr.columns)}")
        print(f"  Index type: {type(cr.index)}")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n=== Step 3: Proxy Ticker (PYPL) Returns ===")
try:
    r = dp.get_daily_returns("PYPL", "2024-01-01", "2025-03-20")
    print(f"  Length: {len(r)}")
    print(f"  Index type: {type(r.index)}")
    if not r.empty:
        print(f"  Date range: {r.index[0]} to {r.index[-1]}")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n=== Step 4: build_factor_matrix ===")
try:
    from factors import build_factor_matrix
    fm = build_factor_matrix("2024-01-01", "2025-03-20")
    print(f"  Shape: {fm.shape}")
    print(f"  Columns: {list(fm.columns)}")
    print(f"  Index type: {type(fm.index)}")
    if not fm.empty:
        print(f"  Date range: {fm.index[0]} to {fm.index[-1]}")
        print(f"  Non-zero counts per col:")
        for c in fm.columns:
            nz = (fm[c] != 0).sum()
            print(f"    {c}: {nz}/{len(fm)} non-zero")
    else:
        print("  ❌ EMPTY")
except Exception as e:
    print(f"  ❌ Error: {e}")
    import traceback; traceback.print_exc()

print("\n=== Step 5: estimate_betas ===")
try:
    import beta_engine as be
    stock_ret = dp.get_daily_returns("PYPL", "2024-01-01", "2025-03-20")
    fm = build_factor_matrix("2024-01-01", "2025-03-20")
    print(f"  Stock returns index type: {type(stock_ret.index)}, dtype: {stock_ret.index.dtype}")
    print(f"  Factor matrix index type: {type(fm.index)}, dtype: {fm.index.dtype}")
    betas = be.estimate_betas(stock_ret, fm, mode="fixed_ols", window=90)
    print(f"  Betas: {betas}")
    if not betas:
        print("  ❌ EMPTY BETAS - alignment issue?")
        # Check overlap
        s_idx = set(str(x) for x in stock_ret.index)
        f_idx = set(str(x) for x in fm.index)
        overlap = s_idx & f_idx
        print(f"  Stock dates sample: {list(stock_ret.index[:3])}")
        print(f"  Factor dates sample: {list(fm.index[:3])}")
        print(f"  Overlap: {len(overlap)} dates")
except Exception as e:
    print(f"  ❌ Error: {e}")
    import traceback; traceback.print_exc()
