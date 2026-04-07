"""
Quick diagnostic — run this from the fintech_terminal directory to verify
key resolution before starting the backend.

Usage: python test_key.py
"""
import json
import os
from pathlib import Path

def check():
    # 1. Env vars
    poly_env = os.getenv("POLYGON_API_KEY") or os.getenv("polygon_api_key") or os.getenv("massive_api_key")
    cg_env = os.getenv("COINGECKO_API_KEY") or os.getenv("coingecko_api_key")

    # 2. ODP user_settings.json
    settings_path = Path.home() / ".openbb_platform" / "user_settings.json"
    odp_creds = {}
    odp_found = False
    if settings_path.exists():
        try:
            data = json.load(open(settings_path, encoding="utf-8"))
            odp_creds = data.get("credentials", {})
            odp_found = True
        except Exception as e:
            print(f"  [ERROR] Could not parse user_settings.json: {e}")

    # 3. Local .env
    env_file = Path(__file__).parent / ".env"

    print("=" * 55)
    print("  Fintech Terminal — Key Resolution Diagnostic")
    print("=" * 55)

    print(f"\n[1] Environment variable  POLYGON_API_KEY : {'SET ✓' if poly_env else 'not set'}")
    print(f"[1] Environment variable  COINGECKO_API_KEY: {'SET ✓' if cg_env else 'not set'}")

    print(f"\n[2] ODP user_settings.json: {settings_path}")
    print(f"    File exists : {odp_found}")
    if odp_found:
        poly_odp = odp_creds.get("polygon_api_key", "")
        cg_odp = odp_creds.get("coingecko_api_key", "")
        print(f"    polygon_api_key  : {'SET ✓ (' + poly_odp[:6] + '...)' if poly_odp else 'NOT FOUND ✗'}")
        print(f"    coingecko_api_key: {'SET ✓ (' + cg_odp[:6] + '...)' if cg_odp else 'not found (optional)'}")
        print(f"    All credential keys: {list(odp_creds.keys())}")

    print(f"\n[3] Local .env file: {env_file}")
    print(f"    File exists : {env_file.exists()}")

    # Final resolution
    poly_odp = odp_creds.get("polygon_api_key", "") if odp_found else ""
    final_polygon = poly_env or poly_odp or ""
    print(f"\n{'=' * 55}")
    print(f"  FINAL: Polygon key will resolve as: {'SET ✓' if final_polygon else 'EMPTY ✗ — will get 401'}")
    print(f"{'=' * 55}\n")

if __name__ == "__main__":
    check()
