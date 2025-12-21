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
def get_deals():
    """Returns list of available deals for the dropdown."""
    # Mock Deals
    return [
        {"label": "Project Alpha (Tech M&A)", "value": "deal_alpha"},
        {"label": "Project Beta (Real Estate)", "value": "deal_beta"},
        {"label": "Project Gamma (Energy)", "value": "deal_gamma"},
    ]

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
def get_files_list(deal_id: str = "deal_alpha", folder_ids: Optional[List[str]] = Query(None)):
    """
    Returns list of filenames in the selected folders.
    """
    if not folder_ids:
        return []
        
    all_files = []
    
    # helper to normalize list input that might contain csv strings
    actual_folder_ids = []
    for item in folder_ids:
        if "," in item:
            actual_folder_ids.extend([x.strip() for x in item.split(",")])
        else:
            actual_folder_ids.append(item)
    
    for folder_name in actual_folder_ids:
        folder_path = os.path.join(DUMMY_PDF_DIR, folder_name)
        if os.path.exists(folder_path):
            files = [
                f for f in os.listdir(folder_path) 
                if f.lower().endswith('.pdf')
            ]
            all_files.extend(files)
            
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
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
