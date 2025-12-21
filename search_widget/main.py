from fastapi import FastAPI, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Union, Any, Dict
import time
import random
from datetime import datetime, timedelta

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "AI Context Scraper Widget Server Running", "widgets_url": "/widgets.json", "apps_url": "/apps.json"}

# --- Models ---

class ExtraCitation(BaseModel):
    citation_format: str = Field(..., description="The format of the citation (e.g., 'link', 'text')")
    content: str = Field(..., description="The content of the citation")

class DataFormat(BaseModel):
    data_type: str = Field(..., description="The type of data (e.g., 'object', 'array')")
    parse_as: str = Field(..., description="How the frontend should parse the data (e.g., 'table', 'chart')")

class OmniWidgetResponse(BaseModel):
    content: List[Dict[str, Any]] = Field(..., description="The content to be displayed")
    data_format: DataFormat = Field(..., description="Format instructions for the frontend")

# --- Real Scraper ---

from ddgs import DDGS

def real_web_scrape(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Performs a real web scrape using DuckDuckGo.
    Returns a list of dictionaries representing scraped artifacts.
    """
    results = []
    try:
        # Use DDGS to search
        ddgs_results = DDGS().text(query, max_results=max_results)
        
        for result in ddgs_results:
            # Map DDGS result to our schema
            results.append({
                "Title": result.get("title", "No Title"),
                "Source": "DuckDuckGo", # DDGS doesn't always give source name easily, but URL is there
                "Date": datetime.now().strftime("%Y-%m-%d"), # DDGS text search might not have date, use current
                "Summary": result.get("body", "No summary available."),
                "Relevance": "High", # Assume high relevance for top results
                "URL": result.get("href", "#")
            })
            
    except Exception as e:
        print(f"Error during search: {e}")
        # Fallback to a simple error message result
        results.append({
            "Title": "Error fetching results",
            "Source": "System",
            "Date": datetime.now().strftime("%Y-%m-%d"),
            "Summary": f"Could not perform search: {str(e)}",
            "Relevance": "Low",
            "URL": "#"
        })
        
    return results

# --- Endpoints ---

from fastapi import Query

@app.get("/agent/scrape_context", response_model=OmniWidgetResponse)
async def scrape_context(
    prompt: str = Query(..., description="The search query"),
    limit: int = Query(5, description="Max number of results")
):
    """
    Endpoint for the AI Context Scraper Widget.
    Accepts a prompt, performs a scrape, and returns structured data for a table.
    """
    # Simulate agent thinking latency
    time.sleep(1.5)
    
    # Call real scraper
    scraped_data = real_web_scrape(prompt, max_results=limit)
    
    # Construct response
    response = OmniWidgetResponse(
        content=scraped_data,
        data_format=DataFormat(
            data_type="object",
            parse_as="table"
        )
    )
    
    return response

import os

# ... (existing imports)

# Get the directory of the current file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.get("/apps.json")
async def get_apps():
    import json
    file_path = os.path.join(BASE_DIR, "apps.json")
    with open(file_path, "r") as f:
        return json.load(f)

@app.get("/widgets.json")
async def get_widgets():
    import json
    file_path = os.path.join(BASE_DIR, "widgets.json")
    with open(file_path, "r") as f:
        return json.load(f)

# Add CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
