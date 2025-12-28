import asyncio
import httpx

async def test_connection():
    url = "http://127.0.0.1:8011/sse"
    print(f"Connecting to {url}...")
    try:
        async with httpx.AsyncClient() as client:
            # SSE usually requires a specific handshake, but a simple GET should verify the port is open and server is accepting
            resp = await client.get(url, timeout=5.0)
            print(f"Status Code: {resp.status_code}")
            print(f"Headers: {resp.headers}")
            print(f"Content (first 200 chars): {resp.text[:200]}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
