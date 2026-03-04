import base64, os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["SharePoint Docs"])

PDF_DIR = Path(__file__).parent.parent / "dummy_pdf"


def _b64(filename: str) -> Optional[str]:
    """Recursively find filename in PDF_DIR and return base64."""
    # Check root first
    root_path = PDF_DIR / filename
    if root_path.exists():
        with open(root_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    # Search subdirectories
    if PDF_DIR.exists():
        for root, _, files in os.walk(PDF_DIR):
            if filename in files:
                with open(os.path.join(root, filename), "rb") as f:
                    return base64.b64encode(f.read()).decode()
    return None


@router.get("/deals")
def sp_deals(q: Optional[str] = Query(None)):
    """Deal list for SharePoint dropdown."""
    deals = [
        {"label": "Project Alpha (Tech M&A)",          "value": "deal_alpha"},
        {"label": "Project Beta (Real Estate)",         "value": "deal_beta"},
        {"label": "Project Gamma (Energy)",             "value": "deal_gamma"},
        {"label": "Project Healthcare (Medical Office)","value": "deal_healthcare"},
        {"label": "Project Hospital (Acute Care)",      "value": "deal_hospital"},
    ]
    if q:
        deals = [d for d in deals if q.lower() in d["label"].lower()]
    return deals


@router.get("/folders")
def sp_folders(deal_id: str = "deal_alpha"):
    if not PDF_DIR.exists():
        return []
    return [{"label": d, "value": d}
            for d in os.listdir(PDF_DIR)
            if os.path.isdir(PDF_DIR / d)]


@router.get("/files_list")
def sp_files_list(deal_id: str = "deal_alpha",
                  portfolio: Optional[List[str]] = Query(None)):
    all_files = []
    deal_folder = PDF_DIR / deal_id
    if deal_folder.exists():
        all_files += [f for f in os.listdir(deal_folder) if f.lower().endswith(".pdf")]
    if portfolio:
        for p in portfolio:
            for pn in ([x.strip() for x in p.split(",")] if "," in p else [p]):
                pf = PDF_DIR / pn
                if pf.exists():
                    all_files += [f for f in os.listdir(pf) if f.lower().endswith(".pdf")]
    if not all_files:
        if PDF_DIR.exists():
            all_files = [f for f in os.listdir(PDF_DIR)
                         if f.lower().endswith(".pdf") and os.path.isfile(PDF_DIR / f)]
    unique = sorted(set(all_files))
    return [{"label": f, "value": f} for f in unique]


@router.get("/documents")
def sp_documents(filename: str = Query(..., description="Filename to fetch")):
    content = _b64(filename)
    if not content:
        raise HTTPException(404, f"File not found: {filename}")
    return {"data_format": {"data_type": "pdf", "filename": filename}, "content": content}
