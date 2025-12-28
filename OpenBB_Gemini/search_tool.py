import os
import httpx
from typing import List, Optional
from pydantic import BaseModel, Field

# --- CONFIGURATION MODEL ---
class GoogleSearchConfig(BaseModel):
    api_key: str = Field(..., description="Google Custom Search API Key")
    cse_id: str = Field(..., description="Google Custom Search Engine ID")

    @classmethod
    def from_env(cls) -> "GoogleSearchConfig":
        """Load configuration from environment variables."""
        api_key = os.getenv("GOOGLE_API_KEY")
        cse_id = os.getenv("GOOGLE_CSE_ID")
        
        if not api_key or not cse_id:
            # Fallback or error - for now allow partials but logic will fail later if missing
            pass  
            
        return cls(
            api_key=api_key if api_key else "",
            cse_id=cse_id if cse_id else ""
        )

# --- RESULT MODEL ---
class SearchResult(BaseModel):
    title: str
    link: str
    snippet: str
    published_date: Optional[str] = None
    source_domain: str
    file_format: Optional[str] = None
    author: Optional[str] = None

# --- METADATA EXTRACTION ---
def _extract_metadata(item: dict) -> dict:
    """
    Extracts publication date, author, and format from Google JSON API response item.
    """
    meta = {
        "published_date": None,
        "author": None,
        "file_format": item.get("fileFormat", None)
    }
    
    # Domain extraction
    display_link = item.get("displayLink", "")
    
    # Pagemap extraction
    pagemap = item.get("pagemap", {})
    metatags = pagemap.get("metatags", [])
    
    if metatags:
        tags = metatags[0]
        # Date heuristics
        meta["published_date"] = (
            tags.get("article:published_time") or 
            tags.get("date") or 
            tags.get("pubdate") or
            tags.get("og:updated_time")
        )
        # Author heuristics
        meta["author"] = (
            tags.get("author") or 
            tags.get("twitter:creator") or
            tags.get("og:site_name") # Fallback to site name as authority
        )

    return meta, display_link

# --- ASYNC SEARCH FUNCTION ---
async def google_search(
    query: str,
    days_back: Optional[int] = None,
    file_type: Optional[str] = None,
    site_filter: Optional[str] = None
) -> List[SearchResult]:
    """
    Executes a Google Custom Search with 'Antigravity' precision using httpx.
    
    Args:
        query: The search query string.
        days_back: Filter results to the last X days (maps to 'dateRestrict').
        file_type: Filter by file extension (e.g., 'pdf', 'xls').
        site_filter: Restrict search to a specific domain (e.g., 'sec.gov').
    """
    config = GoogleSearchConfig.from_env()
    if not config.api_key or not config.cse_id:
        return [SearchResult(title="Configuration Error", link="", snippet="Missing GOOGLE_API_KEY or GOOGLE_CSE_ID", source_domain="System")]

    base_url = "https://www.googleapis.com/customsearch/v1"
    
    params = {
        "q": query,
        "key": config.api_key,
        "cx": config.cse_id,
    }
    
    # Query Builder Logic
    if days_back:
        params["dateRestrict"] = f"d{days_back}"
    if file_type:
        params["fileType"] = file_type
    if site_filter:
        params["siteSearch"] = site_filter
        
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(base_url, params=params, timeout=10.0)
            
            if response.status_code == 429:
                return [SearchResult(title="Quota Exceeded", link="", snippet="Google Search API quota exceeded.", source_domain="Google API")]
            if response.status_code == 403:
                return [SearchResult(title="Permission Denied", link="", snippet="Check API Key and CSE ID.", source_domain="Google API")]
                
            response.raise_for_status()
            data = response.json()
            
            results = []
            items = data.get("items", [])
            
            for item in items:
                metadata, domain = _extract_metadata(item)
                
                results.append(SearchResult(
                    title=item.get("title", "No Title"),
                    link=item.get("link", ""),
                    snippet=item.get("snippet", ""),
                    published_date=metadata["published_date"],
                    source_domain=domain,
                    file_format=metadata["file_format"],
                    author=metadata["author"]
                ))
                
            return results
            
        except Exception as e:
            return [SearchResult(title="Search Error", link="", snippet=str(e), source_domain="System")]
