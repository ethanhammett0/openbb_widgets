import sys
import os
import asyncio
import json
# Force usage of local patched openbb-pydantic-ai library
sys.path.insert(0, r"c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\openbb-pydantic-ai-master\openbb-pydantic-ai-master")

from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()
# Ensure API key is available for pydantic-ai
key = os.getenv("GOOGLE_API_KEY")
if key:
    os.environ["GEMINI_API_KEY"] = key
    print(f"[INFO] Startup: Loaded GOOGLE_API_KEY ({key[:5]}...) -> GEMINI_API_KEY")
else:
    print("[WARNING] Startup: GOOGLE_API_KEY NOT FOUND!")

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from openbb_pydantic_ai import OpenBBAIAdapter, OpenBBDeps

# New Modules
from agent_models import AgentTask, Plan, ExecutionStep
from compression_tool import compress_data

# Tools
from search_tool import google_search
from memory_tool import save_memory, search_memory, read_memory, get_memory_signal

# --- CONFIGURATION ---
AGENT_ID = "gemini-agent"
AGENT_NAME = "Gemini Agent (Dual-Engine v2)"
AGENT_DESCRIPTION = "Loop-proof Agent using Dual-Engine Architecture"
AGENT_BASE_URL = "http://localhost:8013"

# --- MODEL SETUP ---
# Engine B: The Architect (High Reasoning) - HAS TOOLS for planning/execution
architect_model = GoogleModel("gemini-2.0-flash-thinking-exp-1219")

architect = Agent(
    architect_model,
    deps_type=OpenBBDeps,
    retries=2,
)

# Register tools with Architect
architect.tool_plain(google_search)
architect.tool_plain(save_memory)
architect.tool_plain(search_memory)
architect.tool_plain(read_memory)

# Engine C: The Synthesizer - NO TOOLS (Critical for loop prevention)
# This agent CANNOT call tools, so it MUST synthesize with what it has.
synthesizer_model = GoogleModel("gemini-2.0-flash-exp")  # Fast model, no thinking overhead

synthesizer = Agent(
    synthesizer_model,
    deps_type=OpenBBDeps,
    retries=1,
    # NO TOOLS REGISTERED - This is the key to preventing loops
)

# --- APP SETUP ---
app = FastAPI(title=AGENT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pro.openbb.co", "http://localhost:1420"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- TOOL MAP ---
TOOL_MAP = {
    "google_search": google_search,
    "save_memory": save_memory,
    "search_memory": search_memory,
    "read_memory": read_memory
}

# --- HELPERS ---

def is_already_handled(messages) -> bool:
    """
    Checks if the conversation already has an assistant response after the last user message.
    If so, this request is just the client re-sending history, not a new task.
    """
    if not messages:
        return False
    
    # Find the last user message index
    last_user_idx = -1
    for i, m in enumerate(messages):
        role = getattr(m, 'role', '')
        if role == 'user':
            last_user_idx = i
    
    if last_user_idx == -1:
        return False
    
    # Check if there's an assistant message AFTER the last user message
    for i in range(last_user_idx + 1, len(messages)):
        role = getattr(messages[i], 'role', '')
        msg_type = type(messages[i]).__name__
        
        # Assistant response or model response
        if role in ('assistant', 'model'):
            return True
        # Tool result (means we're mid-execution, let adapter handle it)
        if role == 'tool' or 'FunctionCallResult' in msg_type:
            return True
    
    return False


async def execute_pipeline(adapter: OpenBBAIAdapter):
    """
    The LOOP-PROOF Dual-Engine Pipeline.
    
    KEY FIX: Check if this request already has an assistant response.
    If so, delegate to adapter (which handles continuations properly).
    """
    
    messages = adapter.run_input.messages
    
    # === CRITICAL LOOP PREVENTION ===
    # If there's already an assistant response, this is NOT a new task.
    # Just let the adapter handle the continuation normally.
    if is_already_handled(messages):
        print("[DEBUG] Already handled - responding directly (NO TOOLS)")
        # Use synthesizer DIRECTLY to prevent adapter from injecting MCP tools
        last_msg = str(messages[-1].content) if messages else "Hello"
        try:
            async with synthesizer.run_stream(f"Continue the conversation. Last message: {last_msg}") as stream:
                async for chunk in stream.stream_text():
                    yield f'data: {json.dumps({"type": "text", "content": chunk})}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"type": "text", "content": str(e)})}\n\n'
        yield 'event: done\ndata: {}\n\n'
        return
    
    # === NEW REQUEST FLOW (First time seeing this user message) ===
    print("[DEBUG] New request - starting pipeline")
    yield 'event: status\ndata: {"status": "Initializing Dual-Engine Router..."}\n\n'
    
    # Get the user message
    user_messages = [m for m in messages if getattr(m, 'role', '') == 'user']
    if not user_messages:
        current_msg = str(messages[-1].content if messages else "Hello")
    else:
        current_msg = str(user_messages[-1].content)
    
    print(f"[DEBUG] User message: {current_msg[:100]}...")
    
    # 1. INTENT CLASSIFICATION
    yield 'event: status\ndata: {"status": "Classifying intent..."}\n\n'
    
    try:
        intent_result = await architect.run(
            f"Classify this message: '{current_msg}'\n"
            "Is it 'Chat' (casual/simple) or 'Task' (research/analysis)?\n"
            "Return AgentTask JSON.",
            result_type=AgentTask
        )
        task = intent_result.data
    except Exception as e:
        print(f"[WARN] Intent classification failed: {e}")
        task = AgentTask(intent="Chat", initial_question=current_msg)

    # 2. CHAT MODE - Simple delegation
    if task.intent == "Chat":
        yield 'event: status\ndata: {"status": "Mode: Conversational"}\n\n'
        # Use synthesizer DIRECTLY - adapter.run_stream injects MCP tools!
        try:
            async with synthesizer.run_stream(current_msg) as stream:
                async for chunk in stream.stream_text():
                    yield f'data: {json.dumps({"type": "text", "content": chunk})}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"type": "text", "content": str(e)})}\n\n'
        yield 'event: done\ndata: {}\n\n'
        return

    # 3. TASK MODE - Planning + Execution + Synthesis
    yield 'event: status\ndata: {"status": "Mode: Task Execution"}\n\n'
    
    # === DYNAMIC TOOL MAP (Local + MCP) ===
    # Start with local tools
    dynamic_tool_map = dict(TOOL_MAP)
    
    # Add MCP tools from adapter
    mcp_tools = getattr(adapter, '_mcp_tool_lookup', {})
    if callable(getattr(mcp_tools, 'fget', None)):
        # It's a property, access it
        mcp_tools = adapter._mcp_tool_lookup
    
    print(f"[DEBUG] Local tools: {list(TOOL_MAP.keys())}")
    print(f"[DEBUG] MCP tools discovered: {list(mcp_tools.keys()) if mcp_tools else 'None'}")
    
    # Build combined tool list for planning (names only)
    all_tool_names = list(TOOL_MAP.keys()) + list(mcp_tools.keys() if mcp_tools else [])
    
    # A. BUILD PLAN
    yield 'event: status\ndata: {"status": "Building execution plan..."}\n\n'
    
    tool_list = "\n".join([f"- {name}" for name in all_tool_names])
    
    try:
        plan_result = await architect.run(
            f"GOAL: {task.initial_question}\n"
            f"AVAILABLE TOOLS:\n{tool_list}\n"
            "Create a step-by-step plan. Return a Plan object.",
            result_type=Plan
        )
        plan = plan_result.data
    except Exception as e:
        print(f"[ERROR] Planning failed: {e}")
        yield 'event: status\ndata: {"status": "Planning failed, answering directly..."}\n\n'
        try:
            async with synthesizer.run_stream(f"Answer this question: {task.initial_question}") as stream:
                async for chunk in stream.stream_text():
                    yield f'data: {json.dumps({"type": "text", "content": chunk})}\n\n'
        except Exception as e2:
            yield f'data: {json.dumps({"type": "text", "content": f"Error: {e2}"})}\n\n'
        yield 'event: done\ndata: {}\n\n'
        return
    
    yield f'event: status\ndata: {{"status": "Plan: {len(plan.steps)} steps"}}\n\n'
    
    # B. EXECUTE ALL STEPS (Server-side, no round-trips)
    from mcp_executor import execute_mcp_tool, clear_request_cache
    clear_request_cache()  # Fresh cache for this request
    
    results = []
    
    for step in plan.steps:
        yield f'event: status\ndata: {{"status": "Step {step.step_id}: {step.thought[:50]}..."}}\n\n'
        
        # Check if it's a local tool
        if step.tool in TOOL_MAP:
            tool_func = TOOL_MAP[step.tool]
            try:
                result = await tool_func(**step.tool_args)
                raw = str(result)
            except Exception as e:
                raw = f"ERROR: {str(e)}"
        
        # Check if it's an MCP tool - execute server-side!
        elif mcp_tools and step.tool in mcp_tools:
            print(f"[MCP] Executing server-side: {step.tool}")
            try:
                result = await execute_mcp_tool(step.tool, step.tool_args)
                raw = json.dumps(result, indent=2) if isinstance(result, dict) else str(result)
            except Exception as e:
                raw = f"MCP ERROR: {str(e)}"
        
        else:
            raw = f"Tool '{step.tool}' not found"
        
        # Compress if needed
        if len(raw) > 2000:
            yield 'event: status\ndata: {"status": "Compressing large result..."}\n\n'
            raw = await compress_data(raw, step.thought)
        
        results.append(f"[Step {step.step_id}] {step.thought}:\n{raw}")


    
    # C. SYNTHESIZE (Using TOOL-LESS agent DIRECTLY - Bypass adapter to prevent tool injection)
    yield 'event: status\ndata: {"status": "Synthesizing final report..."}\n\n'
    
    combined_data = "\n\n".join(results)
    
    synthesis_prompt = (
        f"USER'S QUESTION: {task.initial_question}\n\n"
        f"COLLECTED DATA:\n{combined_data}\n\n"
        "Write a comprehensive answer using ONLY the data above. Do not call any tools."
    )
    
    # === CRITICAL: Use synthesizer.run_stream DIRECTLY ===
    # DO NOT use adapter.run_stream() - it injects MCP tools and causes loops!
    try:
        async with synthesizer.run_stream(synthesis_prompt) as stream:
            async for chunk in stream.stream_text():
                # Format as SSE for OpenBB
                yield f'data: {json.dumps({"type": "text", "content": chunk})}\n\n'
    except Exception as e:
        print(f"[ERROR] Synthesis failed: {e}")
        yield f'data: {json.dumps({"type": "text", "content": f"Synthesis error: {str(e)}"})}\n\n'
    
    yield 'event: done\ndata: {}\n\n'


import hashlib  # Add at top but we'll add here for now

# Global request counter for debugging
_request_counter = 0
_processed_hashes = set()  # Track processed request hashes

@app.post("/query")
async def query(request: Request):
    """Main endpoint with loop detection."""
    global _request_counter, _processed_hashes
    _request_counter += 1
    request_id = _request_counter
    
    try:
        body = await request.body()
        
        # Create hash of request to detect exact duplicates
        body_hash = hashlib.md5(body[:500]).hexdigest()[:8]  # First 500 bytes
        
        print(f"\n{'='*60}")
        print(f"[REQUEST #{request_id}] Hash: {body_hash}")
        print(f"[REQUEST #{request_id}] Body size: {len(body)} bytes")
        
        # Check if we've seen this EXACT request before
        if body_hash in _processed_hashes:
            print(f"[REQUEST #{request_id}] ⚠️ DUPLICATE REQUEST DETECTED - Already processed hash {body_hash}")
            # Return empty response to break loop
            return JSONResponse({"status": "already_processed", "hash": body_hash})
        
        # Mark as processed
        _processed_hashes.add(body_hash)
        # Keep set from growing forever
        if len(_processed_hashes) > 100:
            _processed_hashes.clear()
        
        query_request = OpenBBAIAdapter.build_run_input(body)
        
        # Log message details
        print(f"[REQUEST #{request_id}] Messages: {len(query_request.messages)}")
        for i, msg in enumerate(query_request.messages):
            role = getattr(msg, 'role', 'unknown')
            content = str(getattr(msg, 'content', ''))[:100]
            msg_type = type(msg).__name__
            print(f"  [{i}] {role} ({msg_type}): {content}...")
        print(f"{'='*60}\n")
        
        adapter = OpenBBAIAdapter(run_input=query_request)
        
        return StreamingResponse(
            execute_pipeline(adapter), 
            media_type="text/event-stream"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/")
def health_check():
    return {"status": "online", "agent": AGENT_NAME, "version": "2.0-loopproof"}


@app.get("/agents.json")
async def agents_json():
    return JSONResponse(
        content={
            AGENT_ID: {
                "name": AGENT_NAME,
                "description": AGENT_DESCRIPTION,
                "endpoints": {"query": f"{AGENT_BASE_URL}/query"},
                "features": {"streaming": True, "mcp-tools": True},
            }
        }
    )


if __name__ == "__main__":
    uvicorn.run("gemini_agent:app", host="0.0.0.0", port=8013, reload=True)

