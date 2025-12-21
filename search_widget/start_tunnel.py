from pyngrok import ngrok
import time
import sys

def start_tunnel():
    try:
        # Open a HTTP tunnel on port 8002
        public_url = ngrok.connect(8002).public_url
        print(f"Public URL: {public_url}")
        sys.stdout.flush()

        # Keep the process alive
        while True:
            time.sleep(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.stdout.flush()

if __name__ == "__main__":
    start_tunnel()
