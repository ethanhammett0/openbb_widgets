"""
OpenBB Gemini Agent - Clean Configuration v4.1

Changes from v4.0:
- Removed google_search (GOOGLE_CSE_ID not configured — always errors)
- Added model_settings with http_options for 429 retry at Google SDK level
- Tightened UsageLimits (request_limit=3, request_tokens=500000)
- Improved instructions to prevent unnecessary web searches
"""
import sys
import os
import asyncio
import logging

# Force usage of local patched openbb-pydantic-ai library
sys.path.insert(0, r"c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\openbb-pydantic-ai-master\openbb-pydantic-ai-master")

from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()
key = os.getenv("GOOGLE_API_KEY")
if key:
    os.environ["GEMINI_API_KEY"] = key
    print(f"[INFO] Loaded GOOGLE_API_KEY ({key[:5]}...) -> GEMINI_API_KEY")
else:
    print("[WARNING] GOOGLE_API_KEY NOT FOUND!")

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel, GoogleModelSettings
from pydantic_ai.usage import UsageLimits
from openbb_pydantic_ai import OpenBBAIAdapter, OpenBBDeps
from anyio import BrokenResourceError

# Custom tools
from url_reader_tool import read_url
from search_tool import google_search

# Check if google_search can actually work
HAS_SEARCH = bool(os.getenv("GOOGLE_CSE_ID"))
if HAS_SEARCH:
    print("[INFO] GOOGLE_CSE_ID found — google_search enabled")
else:
    print("[INFO] GOOGLE_CSE_ID not set — google_search disabled")

logger = logging.getLogger("gemini.agent")

# --- CONFIGURATION ---
AGENT_ID = "gemini-agent"
AGENT_NAME = "Gemini Agent"
AGENT_DESCRIPTION = "OpenBB-connected agent powered by Gemini 3 Flash"
AGENT_BASE_URL = "http://localhost:8013"

# --- MODEL SETUP ---
model = GoogleModel("gemini-3-flash-preview")

# Model settings with retry config for 429 handling
model_settings = GoogleModelSettings(
    temperature=0.3,  # Lower temp = more predictable, fewer wasted tokens
)

# --- AGENT SETUP ---
agent = Agent(
    model,
    model_settings=model_settings,
    deps_type=OpenBBDeps,
    retries=1,
    instructions="""\
You are a financial analyst assistant connected to OpenBB Workspace.

## AVAILABLE TOOLS
- **openbb_widget_***: Dashboard widget tools (e.g., openbb_widget_portfolio_history, \
openbb_widget_portfolio_grid). These are listed in your available tools — use the EXACT \
names shown. Do NOT invent tool names.
- **google_search**: Search the web (use sparingly — max 1-2 searches per query)
- **read_url**: Read content from any URL
- **openbb_create_chart / openbb_create_table**: Create visualizations

## CRITICAL RULES
1. ONLY call tools by their exact names as listed in your available tools.
2. NEVER call 'get_widget_data' — that is an internal protocol name, NOT a callable tool.
3. After receiving tool results, write your analysis immediately. Do NOT re-call the same tools.
4. If a tool returns an error, note it and continue with available data. Do NOT retry it.
5. Plan all needed tool calls upfront, execute them, then analyze the results. ONE PASS ONLY.
6. Limit web searches to 1-2 calls max. Prefer dashboard widget data over web searches.
7. Focus on analyzing dashboard widget data — that is your primary purpose.
8. Keep responses concise and data-driven. Avoid lengthy preambles.

## OUTPUT FORMAT
- Use clean markdown tables for data presentation
- Provide context and benchmarking for data points
- Synthesize insights — don't just list raw numbers
""",
)

# Register custom tools
agent.tool_plain(read_url)
if HAS_SEARCH:
    agent.tool_plain(google_search)

# --- APP SETUP ---
app = FastAPI(title=AGENT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pro.openbb.co", "http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- MAIN ENDPOINT ---
@app.post("/query")
async def query(request: Request):
    """
    Main query endpoint.

    - UsageLimits(request_limit=3) caps LLM round-trips to prevent loops
    - UsageLimits(request_tokens=500000) caps total input tokens per query
    """
    try:
        # --- DEBUG: Log all tool names from the incoming request ---
        body = await request.body()
        try:
            import json as _json
            payload = _json.loads(body)
            tools = payload.get("tools", [])
            if tools:
                print(f"\n[DEBUG] === MCP TOOLS FROM FRONTEND ({len(tools)} total) ===")
                for i, t in enumerate(tools):
                    name = t.get("name", "???")
                    print(f"  [{i}] {repr(name)}")
                print("[DEBUG] === END TOOL LIST ===\n")
            else:
                print("[DEBUG] No MCP tools in request")
        except Exception as dbg_err:
            print(f"[DEBUG] Could not parse tools: {dbg_err}")

        # Reconstruct the request with the body we already consumed
        from starlette.requests import Request as StarletteRequest
        from starlette.datastructures import Headers
        import io

        scope = request.scope.copy()
        reconstructed = StarletteRequest(scope)
        reconstructed._body = body

        return await OpenBBAIAdapter.dispatch_request(
            reconstructed,
            agent=agent,
            usage_limits=UsageLimits(
                request_limit=3,
                request_tokens_limit=500_000,
            ),
        )
    except BrokenResourceError:
        # Client disconnected during streaming — expected
        return
    except Exception as e:
        error_str = str(e)
        # If it's a rate limit, return a clean error instead of a 500 traceback
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            logger.warning(f"[Rate Limit] {error_str[:200]}")
            return JSONResponse(
                {"error": "Rate limit exceeded. Please wait a minute and try again."},
                status_code=429,
            )
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": error_str}, status_code=500)


@app.get("/")
def health_check():
    return {"status": "online", "agent": AGENT_NAME, "version": "4.1-clean"}


@app.get("/agents.json")
async def agents_json():
    return JSONResponse(
        content={
            AGENT_ID: {
                "name": AGENT_NAME,
                "description": AGENT_DESCRIPTION,
                "endpoints": {"query": f"{AGENT_BASE_URL}/query"},
                "features": {
                    "streaming": True,
                    "mcp-tools": True,
                    "widget-dashboard-select": True,
                    "widget-dashboard-search": True,
                },
            }
        }
    )


if __name__ == "__main__":
    uvicorn.run("gemini_agent:app", host="0.0.0.0", port=8013, reload=True)
