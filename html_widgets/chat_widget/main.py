from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get absolute path to the directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(BASE_DIR, "index.html")
WIDGETS_PATH = os.path.join(BASE_DIR, "widgets.json")

print(f"Server starting. Serving files from: {BASE_DIR}")
print(f"HTML Path: {HTML_PATH}")

@app.get("/")
async def get_app():
    if not os.path.exists(HTML_PATH):
        print(f"Error: index.html not found at {HTML_PATH}")
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(HTML_PATH)

@app.get("/widgets.json")
async def get_widgets():
    if not os.path.exists(WIDGETS_PATH):
        return JSONResponse({"error": "widgets.json not found"}, status_code=404)
    with open(WIDGETS_PATH, "r") as f:
        return json.load(f)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8010)
