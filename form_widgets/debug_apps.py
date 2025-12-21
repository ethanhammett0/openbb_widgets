from pathlib import Path
import json
import os

try:
    path = Path(__file__).parent.resolve() / "apps.json"
    print(f"Attempting to load: {path}")
    print(f"File exists: {path.exists()}")
    
    with open(path, encoding='utf-8') as f:
        content = json.load(f)
        print("Successfully loaded JSON")
        print(json.dumps(content, indent=2))
        
except Exception as e:
    print(f"Error: {e}")
