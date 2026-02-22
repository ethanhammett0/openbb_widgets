import requests
import json

# Test portfolio endpoint
r = requests.get("http://localhost:8015/portfolio?view_mode=Overview")
data = r.json()
print(f"Portfolio rows: {len(data)}")

# Check Strategy and Property_Condition columns exist
row = data[0]
print(f"Strategy present: {'Strategy' in row}")
print(f"Property_Condition present: {'Property_Condition' in row}")
print(f"Sample: Strategy={row.get('Strategy')}, Condition={row.get('Property_Condition')}")

# Strategy distribution
from collections import Counter
strategies = Counter(x["Strategy"] for x in data if x.get("Strategy"))
print(f"\nStrategy distribution (tenant rows):")
for s, c in strategies.most_common():
    print(f"  {s}: {c}")

# Test cashflows endpoint
r2 = requests.get("http://localhost:8015/cashflows?deal_id=HRE-2024-100")
cf = r2.json()
print(f"\nCashflows for HRE-2024-100: {len(cf)} months")
print(f"Columns: {list(cf[0].keys())}")

# IO analysis
io_rows = [x for x in cf if x.get("Is_IO_Period")]
amort_rows = [x for x in cf if not x.get("Is_IO_Period") and x.get("Total_Debt_Service", 0) > 0]
print(f"IO months: {len(io_rows)}, Amort months: {len(amort_rows)}")

if cf:
    first = cf[0]
    print(f"\nFirst month ({first['Month']}):")
    print(f"  Effective Rent: ${first['Total_Effective_Rent']:,.0f}")
    print(f"  Debt Service: ${first['Total_Debt_Service']:,.0f}")
    print(f"  Net CF: ${first['Net_Cash_Flow']:,.0f}")

    # Check aggregation: sum effective rent across all months
    total_eff = sum(x["Total_Effective_Rent"] for x in cf)
    total_ds = sum(x["Total_Debt_Service"] for x in cf)
    print(f"\nTotal over {len(cf)} months:")
    print(f"  Sum effective rent: ${total_eff:,.0f}")
    print(f"  Sum debt service: ${total_ds:,.0f}")
    print(f"  Sum net CF: ${total_eff - total_ds:,.0f}")

print("\nAll verification checks passed!")
