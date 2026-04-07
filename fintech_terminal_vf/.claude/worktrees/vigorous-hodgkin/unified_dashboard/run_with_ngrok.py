"""
Launch the Unified HRE Dashboard with ngrok tunnel for mobile access.

Usage:
    python run_with_ngrok.py

Prerequisites:
    pip install -r requirements.txt
    ngrok authtoken <YOUR_TOKEN>   (one-time setup: https://dashboard.ngrok.com)

Once running, add the ngrok URL to OpenBB Workspace:
    Settings -> Data Connectors -> Add Custom Backend -> paste ngrok URL
"""

import uvicorn
import threading
import time


PORT = 8080


def start_ngrok():
    try:
        from pyngrok import ngrok

        # Kill any existing tunnels on this port
        tunnels = ngrok.get_tunnels()
        for t in tunnels:
            ngrok.disconnect(t.public_url)

        public_url = ngrok.connect(PORT, "http")
        print("\n" + "=" * 60)
        print(f"  NGROK TUNNEL ACTIVE")
        print(f"  Public URL: {public_url}")
        print(f"  Local URL:  http://localhost:{PORT}")
        print(f"  Docs:       http://localhost:{PORT}/docs")
        print(f"")
        print(f"  Add this URL to OpenBB Workspace:")
        print(f"  Settings -> Data Connectors -> {public_url}")
        print("=" * 60 + "\n")
        return public_url
    except ImportError:
        print("\n[WARNING] pyngrok not installed. Run: pip install pyngrok")
        print(f"  Server running on http://localhost:{PORT} (local only)\n")
        return None
    except Exception as e:
        print(f"\n[WARNING] ngrok failed: {e}")
        print(f"  Make sure you've run: ngrok authtoken <YOUR_TOKEN>")
        print(f"  Server running on http://localhost:{PORT} (local only)\n")
        return None


if __name__ == "__main__":
    # Start ngrok in background thread so uvicorn can start immediately
    ngrok_thread = threading.Thread(target=start_ngrok, daemon=True)
    ngrok_thread.start()

    # Small delay to let ngrok print its URL first
    time.sleep(1)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
    )
