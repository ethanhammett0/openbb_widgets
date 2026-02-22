"""Helpers for constructing deferred MCP toolsets from QueryRequest payloads."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from collections.abc import Sequence
from typing import Any

from openbb_ai.models import AgentTool
from pydantic_ai.tools import ToolDefinition
from pydantic_ai.toolsets import ExternalToolset

from openbb_pydantic_ai._dependencies import OpenBBDeps

logger = logging.getLogger(__name__)

# Module-level cache that persists across requests within the same server session.
# This prevents redundant MCP API calls when the model loops or retries.
# Cache entries expire after 5 minutes to prevent stale data.
_SESSION_CACHE: dict[str, tuple[Any, float]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


def _make_cache_key(tool_name: str, args: dict[str, Any]) -> str:
    """Generate a unique cache key for tool+args combination."""
    try:
        payload = json.dumps(
            {"tool": tool_name, "args": args}, 
            sort_keys=True, 
            default=str
        )
        return hashlib.sha256(payload.encode()).hexdigest()[:16]
    except (TypeError, ValueError):
        payload = f"{tool_name}:{repr(args)}"
        return hashlib.sha256(payload.encode()).hexdigest()[:16]


def get_session_cached_result(tool_name: str, args: dict[str, Any]) -> Any | None:
    """Get cached result from session cache if it exists and hasn't expired."""
    key = _make_cache_key(tool_name, args)
    entry = _SESSION_CACHE.get(key)
    if entry is None:
        return None
    
    result, timestamp = entry
    if time.time() - timestamp > _CACHE_TTL_SECONDS:
        # Expired - remove from cache
        del _SESSION_CACHE[key]
        logger.debug(f"Session cache EXPIRED for {tool_name}")
        return None
    
    logger.info(f"Session cache HIT for {tool_name} - skipping redundant API call")
    return result


def set_session_cached_result(tool_name: str, args: dict[str, Any], result: Any) -> None:
    """Store result in session cache with timestamp."""
    key = _make_cache_key(tool_name, args)
    _SESSION_CACHE[key] = (result, time.time())
    logger.debug(f"Session cached result for {tool_name}")


def clear_session_cache() -> None:
    """Clear the session cache. Call when starting a new conversation."""
    _SESSION_CACHE.clear()
    logger.debug("Session cache cleared")


class MCPToolset(ExternalToolset[OpenBBDeps]):
    """External toolset exposing workspace-selected MCP tools with call caching.
    
    Uses both instance cache (for within-request) and module-level session cache
    (for cross-request deduplication). The session cache prevents redundant API
    calls when the model loops or retries.
    """

    def __init__(self, tools: Sequence[AgentTool]):
        self.tools_by_name: dict[str, AgentTool] = {}
        self._call_cache: dict[str, Any] = {}  # Instance cache for within-request

        tool_defs: list[ToolDefinition] = []
        for tool in tools:
            tool_def = ToolDefinition(
                name=tool.name,
                parameters_json_schema=tool.input_schema
                or {"type": "object", "properties": {}, "additionalProperties": True},
                description=tool.description or "",
            )
            tool_defs.append(tool_def)
            self.tools_by_name[tool_def.name] = tool

        super().__init__(tool_defs)

    def _cache_key(self, tool_name: str, args: dict[str, Any]) -> str:
        """Generate a unique cache key for tool+args combination."""
        return _make_cache_key(tool_name, args)

    def get_cached_result(self, tool_name: str, args: dict[str, Any]) -> Any | None:
        """Return cached result - checks both instance and session cache."""
        # Check instance cache first (faster)
        key = self._cache_key(tool_name, args)
        result = self._call_cache.get(key)
        if result is not None:
            return result
        
        # Check session cache (cross-request)
        cached = get_session_cached_result(tool_name, args)
        if cached is not None:
            # Return summarized cached data to save tokens
            from ._event_stream_helpers import summarize_for_context
            summary = summarize_for_context(cached, max_chars=1500)
            return (
                f"[CACHED] Data already retrieved. Proceed with your task.\n\n"
                f"{summary}"
            )
        return None

    def cache_result(
        self, tool_name: str, args: dict[str, Any], result: Any
    ) -> None:
        """Store a tool result in both instance and session cache."""
        key = self._cache_key(tool_name, args)
        self._call_cache[key] = result
        set_session_cached_result(tool_name, args, result)

    def has_cached_result(self, tool_name: str, args: dict[str, Any]) -> bool:
        """Check if a cached result exists in either cache."""
        key = self._cache_key(tool_name, args)
        if key in self._call_cache:
            return True
        return get_session_cached_result(tool_name, args) is not None

    def clear_cache(self) -> None:
        """Clear instance cache only."""
        self._call_cache.clear()

    def cache_stats(self) -> dict[str, int]:
        """Return cache statistics for debugging."""
        return {
            "instance_cached": len(self._call_cache),
            "session_cached": len(_SESSION_CACHE),
        }


def build_mcp_toolsets(
    tools: Sequence[AgentTool] | None,
) -> tuple[MCPToolset, ...]:
    """Create MCP toolsets mirroring only the tools selected in the UI."""

    if not tools:
        return ()

    return (MCPToolset(tools),)

