import os
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()
# Ensure API key is available for pydantic-ai
key = os.getenv("GOOGLE_API_KEY")
if key:
    os.environ["GEMINI_API_KEY"] = key
    print(f"💰 Startup: Loaded GOOGLE_API_KEY ({key[:5]}...) -> GEMINI_API_KEY")
else:
    print("⚠️ Startup: GOOGLE_API_KEY NOT FOUND!")

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel, GoogleModelSettings
from openbb_pydantic_ai import OpenBBAIAdapter, OpenBBDeps

# --- CONFIGURATION ---
AGENT_ID = "gemini-agent"
AGENT_NAME = "Gemini Agent (OpenBB)"
AGENT_DESCRIPTION = "OpenBB-connected agent using Google Gemini 3 (Deep Think)"
AGENT_BASE_URL = "http://localhost:8013"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY not found in environment variables.")

# --- MODEL SETUP ---
# "Deep Think" is controlled via the GoogleModelSettings
model_settings = GoogleModelSettings(
    google_thinking_config={
        "include_thoughts": True,   # REQUIRED to see the logs
        "thinking_level": "high",   # Gemini 3 specific. Forces maximum reasoning depth.
    },
    google_safety_settings=[        # Optional: loosen safety for financial jargon
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"}
    ]
)

# using gemini-3-pro-preview as requested ("Gemini 3")
model = GoogleModel(
    "gemini-3-pro-preview",
)

agent = Agent(
    model,
    model_settings=model_settings, 
    instructions=(
        "You are a Senior Financial Analyst specializing in healthcare real estate analysis.\n\n"
        
        "CRITICAL: SINGLE-PASS DATA COLLECTION\n"
        "You MUST complete all data collection in ONE round of tool calls. After receiving tool results, "
        "proceed DIRECTLY to analysis and report generation. DO NOT call tools a second time.\n\n"
        
        "TOOL USAGE RULES:\n"
        "1. Plan ALL your tool calls upfront in your thinking.\n"
        "2. Execute ALL planned calls in a SINGLE batch.\n"
        "3. NEVER repeat a tool call you have already made - the data is already available.\n"
        "4. After receiving results, IMMEDIATELY write your analysis using that data.\n"
        "5. If a tool returns an error, note it and move on - do not retry.\n"
        "6. ONLY use MCP tools explicitly provided. Do NOT call widgets like 'Scorecard' or 'Benchmarker'.\n\n"
        
        "WORKFLOW:\n"
        "Step 1: Think - identify ALL tools needed with exact parameters.\n"
        "Step 2: Call - execute ALL tools in one batch.\n"
        "Step 3: Analyze - use the returned data to write your report.\n"
        "Step 4: DONE - do not go back to Step 2.\n\n"
        
        "OUTPUT FORMAT:\n"
        "- Clean markdown tables for data.\n"
        "- Context and benchmarking for every data point.\n"
        "- Synthesize insights, don't just list numbers.\n"
    ),
    deps_type=OpenBBDeps,
    retries=2,
)

# --- APP SETUP ---
app = FastAPI(title=AGENT_NAME)

# CORS - Critical for OpenBB Workspace connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pro.openbb.co", "http://localhost:1420"], # Added localhost for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENDPOINTS ---

@app.get("/test_gemini")
async def test_gemini():
    """Debug endpoint to test agent directly"""
    try:
        print("Testing agent from /test_gemini...")
        result = await agent.run("Hello Gemini 3")
        return {"status": "success", "response": result.data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}

@app.get("/")
def health_check():
    return {"status": "online", "agent": AGENT_NAME}

@app.get("/agents.json")
async def agents_json():
    """OpenBB Agent Discovery Endpoint"""
    return JSONResponse(
        content={
            AGENT_ID: {
                "name": AGENT_NAME,
                "description": AGENT_DESCRIPTION,
                "image": "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg", # Placeholder logo
                "endpoints": {
                    "query": f"{AGENT_BASE_URL}/query",
                },
                "features": {
                    "streaming": True,
                    "widget-dashboard-select": True,
                    "widget-dashboard-search": True,
                    "mcp-tools": True, # Enabled if requested, though no external MCP currently configured
                },
            }
        }
    )

@app.post("/query")
async def query(request: Request):
    """
    Main query endpoint.
    OpenBBAIAdapter handles the QueryRequest parsing, Pydantic AI execution,
    and SSE streaming back to the workspace.
    """
    return await OpenBBAIAdapter.dispatch_request(
        request, 
        agent=agent,
        output_type=str,  # Explicit string output to prevent validation failures
    )

if __name__ == "__main__":
    uvicorn.run("gemini_agent:app", host="0.0.0.0", port=8013, reload=True)
