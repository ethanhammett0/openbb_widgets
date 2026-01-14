import httpx
from typing import Any, Dict, Optional

class ProPublicaClient:
    """Client for interacting with the ProPublica Nonprofit Explorer API."""

    def __init__(self, base_url: str = "https://projects.propublica.org/nonprofits/api/v2"):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    async def make_request(self, path: str, method: str = "GET", params: Optional[Dict[str, Any]] = None) -> Any:
        """Make a request to the ProPublica API."""
        url = f"{self.base_url}/{path.lstrip('/')}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                return {"error": f"HTTP Error: {e.response.status_code}", "details": e.response.text}
            except Exception as e:
                return {"error": f"Request failed: {str(e)}"}
