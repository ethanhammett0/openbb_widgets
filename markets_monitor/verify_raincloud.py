
import sys
import os
import json

# Add current dir to path
sys.path.append(os.getcwd())

from main import get_raincloud

try:
    print("Testing /raincloud endpoint...")
    result = get_raincloud(
        start_date="2024-01-01", 
        end_date="2025-12-31", 
        metric="spread",
        deal_type="",
        highlight_deal="HRE-2024-001" # Dummy ID to test highlight, might not exist but code handles empty match
    )
    
    # Check if result is valid JSON dict (Plotly figure)
    if isinstance(result, dict) and "data" in result and "layout" in result:
        print("SUCCESS: Valid Plotly JSON returned.")
        # Check for Violin trace
        has_violin = any(trace.get('type') == 'violin' for trace in result['data'])
        if has_violin:
            print("SUCCESS: Violin trace found.")
        else:
            print("FAILURE: No violin trace found.")
            
        # Check for Highlight Shape (if any deal matched) or just that code ran
        print("Data traces:", len(result['data']))
    else:
        print("FAILURE: Invalid response format.")
        print(result)

except Exception as e:
    print(f"FAILURE: Exception occurred: {e}")
    import traceback
    traceback.print_exc()
