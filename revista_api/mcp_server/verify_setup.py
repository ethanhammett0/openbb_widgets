import sys
import os

# Ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app_factory import create_revista_app

def verify():
    print("Initializing App...")
    try:
        app = create_revista_app(docs_path="../revista_docs.json")
        print("App Initialized Successfully.")
        print(f"Total Routes: {len(app.routes)}")
        
        # List first 5 routes to verify parsing
        print("\nRoute Sample:")
        for route in app.routes[:10]:
            if hasattr(route, "path"):
                print(f"- {list(route.methods)[0]} {route.path} -> Name: {route.name}")
                if hasattr(route, "openapi_extra"):
                     print(f"  MCP Config: {route.openapi_extra.get('mcp_config', {}).get('name')}")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify()
