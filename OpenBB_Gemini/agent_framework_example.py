from anyio import BrokenResourceError
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPServerStreamableHTTP
from pydantic_ai.models.openai import OpenAIChatModel
from openbb_pydantic_ai import OpenBBAIAdapter, OpenBBDeps
# Connect to local MCP server for additional tools
mcp = MCPServerStreamableHTTP(
    url="http://localhost:8001/mcp/",
    max_retries=3,
)
# Use any OpenRouter model you prefer
model = OpenAIChatModel(
    provider="openrouter",
    model_name="prime-intellect/intellect-3",
)
# Define agent with workspace-aware instructions
agent = Agent(
    model,
    instructions=(
        """
        You have access to the OpenBB Workspace and you can use the widgets to get data.
        To get data use the widget tools.
        Other data sources and analysis tools are available via the MCP toolset.
        When you want to visualize data, use the `openbb_create_chart` tool.
        This tool supports line, bar, scatter, pie, and donut charts.
        Always use this tool when you want to display visualizations.
        For tables, simply output markdown tables and they will be rendered nicely.
        Or use the `openbb_create_table` tool for large tables.
        Use placerholder {{place_chart_here}} in your response to indicate where charts should go.
        Highlight key insights and suggest actionable next steps when helpful.
        If the next step is obvious, you can just do it without asking the user.
        """
    ),
    deps_type=OpenBBDeps,
    retries=3,
    toolsets=[mcp],
)
app = FastAPI()
AGENT_BASE_URL = "http://localhost:8003"
# OpenBB Workspace discovers agents via this endpoint
@app.get("/agents.json")
async def agents_json():
    return JSONResponse(
        content={
            "<agent-id>": {
                "name": "My Custom Agent",
                "description": "This is my custom agent",
                "image": f"{AGENT_BASE_URL}/my-custom-agent/logo.png",
                "endpoints": {
                    "query": f"{AGENT_BASE_URL}/query",
                },
                "features": {
                    "streaming": True,
                    "widget-dashboard-select": True,  # Access priority widgets
                    "widget-dashboard-search": True,  # Access non-priority widgets
                    "mcp-tools": True,               # Use MCP tools
                },
            }
        }
    )
# Main query endpoint that handles SSE streaming
@app.post("/query")
async def query(request: Request):
    """
    OpenBB Workspace sends POST requests with QueryRequest payload.
    The adapter handles SSE streaming automatically.
    """
    try:
        return await OpenBBAIAdapter.dispatch_request(
            request, agent=agent
        )
    except BrokenResourceError:
        # Client disconnected we expect this sometimes
        pass
# CORS configuration for OpenBB Workspace domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pro.openbb.co"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)