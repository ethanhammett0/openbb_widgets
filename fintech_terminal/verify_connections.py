"""
Endpoint verification script — tests all API connections and key endpoints.
Run while server is active on port 7780.
"""
import httpx
import json
import sys
import time

BASE = "http://localhost:7780"
results = []

def test(name, path, expected_type="list", min_items=0, timeout=30):
    """Test an endpoint and report results."""
    try:
        r = httpx.get(f"{BASE}{path}", timeout=timeout)
        status = r.status_code
        data = r.json()
        
        if status != 200:
            results.append(("FAIL", name, f"HTTP {status}"))
            return
        
        if expected_type == "list":
            if isinstance(data, list):
                count = len(data)
                if count >= min_items:
                    results.append(("PASS", name, f"{count} items"))
                else:
                    results.append(("WARN", name, f"Only {count} items (expected >= {min_items})"))
            else:
                results.append(("FAIL", name, f"Expected list, got {type(data).__name__}"))
        elif expected_type == "dict":
            if isinstance(data, dict):
                results.append(("PASS", name, f"{len(data)} keys"))
            else:
                results.append(("FAIL", name, f"Expected dict, got {type(data).__name__}"))
        elif expected_type == "plotly":
            if isinstance(data, dict) and "data" in data:
                results.append(("PASS", name, f"Plotly chart with {len(data.get('data',[]))} traces"))
            elif isinstance(data, list):
                results.append(("PASS", name, f"Raw data: {len(data)} items"))
            else:
                results.append(("WARN", name, f"Unexpected response type: {type(data).__name__}"))
        else:
            results.append(("PASS", name, f"OK ({type(data).__name__})"))
    except httpx.TimeoutException:
        results.append(("TIMEOUT", name, f"Timed out after {timeout}s"))
    except Exception as e:
        results.append(("ERROR", name, str(e)[:80]))

print("=" * 70)
print("FINTECH TERMINAL — ENDPOINT VERIFICATION")
print("=" * 70)

# ── Config endpoints ──
print("\n--- Config Endpoints ---")
test("widgets.json", "/widgets.json", "dict")
test("apps.json", "/apps.json", "list", 1)

# ── Utility endpoints ──
print("\n--- Utility Endpoints ---")
test("Symbols dropdown", "/symbols", "list", 10)
test("Sub-sectors dropdown", "/sub_sectors", "list", 5)
test("Pairs dropdown", "/pairs", "list", 5)
test("Factors dropdown", "/factors", "list", 10)
test("Beta modes dropdown", "/beta_modes", "list", 3)

# ── Tab 1: Morning Pulse (Polygon API) ──
print("\n--- Tab 1: Morning Pulse (Polygon API) ---")
test("Universe Movers", "/universe_movers?sub_sector=All", "list", 1, timeout=30)
test("Gainers/Losers", "/gainers_losers", "list", 1, timeout=30)
test("Macro Inputs (CoinGecko + Polygon)", "/macro_inputs", "list", 1, timeout=30)
test("Corporate Actions Calendar", "/corporate_actions_calendar", "list", 0, timeout=30)

# ── Tab 6: Corporate Actions (Polygon API) ──
print("\n--- Tab 6: Corporate Actions (Polygon API) ---")
test("Dividend Calendar", "/dividend_calendar", "list", 0, timeout=30)
test("Universe Reference", "/universe_reference", "list", 1, timeout=60)

print("\n" + "=" * 70)
print("RESULTS SUMMARY")
print("=" * 70)

pass_count = sum(1 for r in results if r[0] == "PASS")
warn_count = sum(1 for r in results if r[0] == "WARN")
fail_count = sum(1 for r in results if r[0] in ("FAIL", "ERROR", "TIMEOUT"))
total = len(results)

for status, name, detail in results:
    icon = {"PASS": "✅", "WARN": "⚠️", "FAIL": "❌", "ERROR": "❌", "TIMEOUT": "⏰"}.get(status, "?")
    print(f"  {icon} {status:7s} | {name:45s} | {detail}")

print(f"\nTotal: {total} | ✅ Pass: {pass_count} | ⚠️ Warn: {warn_count} | ❌ Fail: {fail_count}")
if fail_count == 0:
    print("\n🎉 All connections verified!")
else:
    print(f"\n⚠️ {fail_count} endpoint(s) need attention")
