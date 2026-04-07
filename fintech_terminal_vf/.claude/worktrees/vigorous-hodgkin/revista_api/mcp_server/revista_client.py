import os
import httpx
from typing import Any, Dict, Optional
import httpx

class RevistaClient:
    """Client for interacting with the Revista API."""

    def __init__(self, base_url: str = "https://api.revistamed.com", api_key: Optional[str] = None, subscription_key: Optional[str] = None):
        self.base_url = base_url.rstrip("/")
        # Try to get keys from environment if not provided
        self.api_key = api_key or os.environ.get("REVISTA_API_KEY") or os.environ.get("revista_api_key", "")
        self.subscription_key = subscription_key or os.environ.get("REVISTA_SUBSCRIPTION_KEY", "")
        
        # Configure headers - adjusting based on typical patterns, can be refined
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if self.api_key:
             # self.headers["Ocp-Apim-Subscription-Key"] = self.api_key 
             pass # using query param instead

    async def make_request(self, path: str, method: str = "GET", params: Optional[Dict[str, Any]] = None, body: Optional[Dict[str, Any]] = None) -> Any:
        """Make a request to the Revista API."""
        url = f"{self.base_url}/{path.lstrip('/')}"
        
        # Add ApiKey to params
        if params is None:
            params = {}
        if self.api_key:
            params["ApiKey"] = self.api_key
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    params=params,
                    json=body
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                return {"error": f"HTTP Error: {e.response.status_code}", "details": e.response.text}
            except Exception as e:
                return {"error": f"Request failed: {str(e)}"}
