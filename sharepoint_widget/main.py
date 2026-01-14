import base64
import os
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Union
import uvicorn
import json

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DUMMY_PDF_DIR = os.path.join(os.path.dirname(__file__), "dummy_pdf")

# --- Helpers ---

def get_base64_pdf(filename: str) -> Optional[str]:
    """
    Recursively searches for filename in dummy_pdf and returns base64 content.
    """
    target_path = None
    # 1. Check root
    root_path = os.path.join(DUMMY_PDF_DIR, filename)
    if os.path.exists(root_path):
        target_path = root_path
    else:
        # 2. Search subdirectories
        if os.path.exists(DUMMY_PDF_DIR):
            for root, dirs, files in os.walk(DUMMY_PDF_DIR):
                if filename in files:
                    target_path = os.path.join(root, filename)
                    break
    
    if target_path and os.path.exists(target_path):
        try:
            with open(target_path, "rb") as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            return None
    
    print(f"DEBUG: get_base64_pdf failed to find {filename} in {DUMMY_PDF_DIR}")
    return None

# --- Endpoints ---

@app.get("/widgets.json")
def get_widgets_config():
    try:
        with open("widgets.json", "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/apps.json")
def get_apps_config():
    try:
        with open("apps.json", "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deals")
def get_deals(q: Optional[str] = Query(None)):
    """Returns list of available deals for the dropdown, supporting search."""
    deals = [
        {"label": "Project Alpha (Tech M&A)", "value": "deal_alpha"},
        {"label": "Project Beta (Real Estate)", "value": "deal_beta"},
        {"label": "Project Gamma (Energy)", "value": "deal_gamma"},
        {"label": "Project Healthcare (Medical Office)", "value": "deal_healthcare"},
        {"label": "Project Hospital (Acute Care)", "value": "deal_hospital"}
    ]
    if q:
        deals = [d for d in deals if q.lower() in d["label"].lower()]
    return deals

@app.get("/folders")
def get_folders(deal_id: str = "deal_alpha"):
    """
    Returns list of subdirectories in dummy_pdf.
    Ignores deal_id argument in this mock implementation, 
    serving the same physical folders for all deals.
    """
    if not os.path.exists(DUMMY_PDF_DIR):
        return []
        
    folders = []
    for d in os.listdir(DUMMY_PDF_DIR):
        if os.path.isdir(os.path.join(DUMMY_PDF_DIR, d)):
            folders.append({"label": d, "value": d})
            
    return folders

@app.get("/files_list")
def get_files_list(
    deal_id: str = "deal_alpha", 
    portfolio: Optional[List[str]] = Query(None)
):
    """
    Returns list of filenames based on deal and portfolio.
    """
    print(f"DEBUG: get_files_list called for deal_id: {deal_id}, portfolio: {portfolio}")
    
    all_files = []
    
    # 1. Check deal-specific folder if it exists
    deal_folder = os.path.join(DUMMY_PDF_DIR, deal_id)
    if os.path.exists(deal_folder):
        all_files.extend([f for f in os.listdir(deal_folder) if f.lower().endswith('.pdf')])
    
    # 2. Check portfolio-specific folders
    if portfolio:
        for p in portfolio:
            # handle csv strings
            p_list = [x.strip() for x in p.split(",")] if "," in p else [p]
            for p_name in p_list:
                p_folder = os.path.join(DUMMY_PDF_DIR, p_name)
                if os.path.exists(p_folder):
                    all_files.extend([f for f in os.listdir(p_folder) if f.lower().endswith('.pdf')])
    
    # 3. If no filters or empty, just show root files
    if not all_files:
        all_files = [f for f in os.listdir(DUMMY_PDF_DIR) if f.lower().endswith('.pdf') and os.path.isfile(os.path.join(DUMMY_PDF_DIR, f))]

    # Deduplicate and sort
    unique_files = sorted(list(set(all_files)))
    return [{"label": f, "value": f} for f in unique_files]

from fastapi import Request

@app.get("/documents")
def get_documents(filename: str = Query(..., description="Filename to fetch")):
    """
    Returns base64 encoded content for a SINGLE file.
    Matches congress-main reference implementation.
    """
    print(f"DEBUG: GET /documents called for filename: {filename}")
    
    b64_content = get_base64_pdf(filename)
    if not b64_content:
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
    return {
        "data_format": {
            "data_type": "pdf", 
            "filename": filename
        },
        "content": b64_content
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)
