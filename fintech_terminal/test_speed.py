"""Quick response-time test for key endpoints."""
import httpx, time

BASE = "http://localhost:7780"

tests = [
    ("Universe Movers (Tab1)", "/universe_movers"),
    ("Macro Inputs (Tab1)", "/macro_inputs"),
    ("Factor Bar PYPL (Tab2)", "/factor_bar?symbol=PYPL&beta_mode=kalman&lookback=90"),
    ("SubSect Perf Bar (Tab4)", "/subsector_perf_bar?period=1m"),
    ("Pair Metrics V_MA (Tab5)", "/pair_metrics?pair=V_MA"),
    ("Spread Chart V_MA (Tab5)", "/spread_chart?pair=V_MA&lookback=252"),
]

for name, path in tests:
    t0 = time.time()
    try:
        r = httpx.get(f"{BASE}{path}", timeout=120)
        elapsed = time.time()-t0
        data = r.json()
        size = len(data) if isinstance(data, list) else ("plotly" if isinstance(data, dict) and "data" in data else len(str(data)[:50]))
        status = "✅" if r.status_code==200 else "❌"
        print(f"  {status} {name:35s} | {elapsed:6.1f}s | {r.status_code} | {size}")
    except Exception as e:
        elapsed = time.time()-t0
        print(f"  ❌ {name:35s} | {elapsed:6.1f}s | ERROR: {str(e)[:60]}")
