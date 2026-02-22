"""
URL Content Reader Tool

Fetches and extracts readable content from URLs, converting HTML to clean text.
"""
import httpx
from typing import Optional
from pydantic import BaseModel, Field


class URLContent(BaseModel):
    """Structured response from URL reading."""
    url: str
    title: Optional[str] = None
    content: str
    error: Optional[str] = None


async def read_url(url: str, max_chars: int = 8000) -> URLContent:
    """
    Fetches content from a URL and extracts readable text.
    
    Args:
        url: The URL to fetch content from.
        max_chars: Maximum characters to return (default 8000 to avoid token limits).
    
    Returns:
        URLContent with extracted text or error message.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            content_type = response.headers.get("content-type", "")
            
            # Handle different content types
            if "application/json" in content_type:
                return URLContent(
                    url=url,
                    title="JSON Response",
                    content=response.text[:max_chars]
                )
            
            if "text/plain" in content_type:
                return URLContent(
                    url=url,
                    title="Plain Text",
                    content=response.text[:max_chars]
                )
            
            # HTML processing
            html = response.text
            
            # Extract title
            title = None
            if "<title>" in html.lower():
                start = html.lower().find("<title>") + 7
                end = html.lower().find("</title>")
                if end > start:
                    title = html[start:end].strip()
            
            # Simple HTML to text conversion
            text = _html_to_text(html)
            
            # Truncate if needed
            if len(text) > max_chars:
                text = text[:max_chars] + "\n\n[Content truncated...]"
            
            return URLContent(
                url=url,
                title=title,
                content=text
            )
            
    except httpx.TimeoutException:
        return URLContent(url=url, content="", error="Request timed out")
    except httpx.HTTPStatusError as e:
        return URLContent(url=url, content="", error=f"HTTP {e.response.status_code}")
    except Exception as e:
        return URLContent(url=url, content="", error=str(e))


def _html_to_text(html: str) -> str:
    """
    Convert HTML to readable plain text.
    Simple implementation without external dependencies.
    """
    import re
    
    # Remove scripts and styles
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<head[^>]*>.*?</head>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<nav[^>]*>.*?</nav>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<footer[^>]*>.*?</footer>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    # Convert common elements to text markers
    html = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'\n\n## \1\n', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<p[^>]*>', '\n\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<br[^>]*/?>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<li[^>]*>', '\n• ', html, flags=re.IGNORECASE)
    
    # Remove remaining tags
    html = re.sub(r'<[^>]+>', ' ', html)
    
    # Decode common HTML entities
    html = html.replace('&nbsp;', ' ')
    html = html.replace('&amp;', '&')
    html = html.replace('&lt;', '<')
    html = html.replace('&gt;', '>')
    html = html.replace('&quot;', '"')
    html = html.replace('&#39;', "'")
    html = html.replace('&mdash;', '—')
    html = html.replace('&ndash;', '–')
    
    # Clean up whitespace
    html = re.sub(r'[ \t]+', ' ', html)
    html = re.sub(r'\n\s*\n\s*\n+', '\n\n', html)
    
    return html.strip()
