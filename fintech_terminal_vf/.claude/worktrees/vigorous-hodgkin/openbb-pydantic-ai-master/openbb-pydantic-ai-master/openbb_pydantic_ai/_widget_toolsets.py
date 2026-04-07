"""Toolset implementations for OpenBB widgets."""

from __future__ import annotations

import re
from collections.abc import Sequence
from typing import Any

from openbb_ai.models import Undefined, Widget, WidgetCollection, WidgetParam
from pydantic_ai.tools import ToolDefinition
from pydantic_ai.toolsets import AbstractToolset, ExternalToolset

from openbb_pydantic_ai._config import PARAM_TYPE_SCHEMA_MAP
from openbb_pydantic_ai._dependencies import OpenBBDeps


def _base_param_schema(param: WidgetParam) -> dict[str, Any]:
    """Build the base JSON schema for a widget parameter."""
    schema = PARAM_TYPE_SCHEMA_MAP.get(param.type, {"type": "string"})
    schema = dict(schema)  # copy
    schema["description"] = param.description

    if param.options:
        schema["enum"] = list(param.options)

    if param.get_options:
        schema.setdefault(
            "description",
            param.description + " (options retrieved dynamically)",
        )

    if param.default_value is not Undefined.UNDEFINED:
        schema["default"] = param.default_value

    if param.current_value is not None and param.multi_select is False:
        schema.setdefault("examples", []).append(param.current_value)

    return schema


def _param_schema(param: WidgetParam) -> tuple[dict[str, Any], bool]:
    """Return the schema for a parameter and whether it's required."""
    schema = _base_param_schema(param)

    if param.multi_select:
        schema = {
            "type": "array",
            "items": schema,
            "description": schema.get("description"),
        }

    is_required = param.default_value is Undefined.UNDEFINED
    return schema, is_required


def _widget_schema(widget: Widget) -> dict[str, Any]:
    """Build the JSON schema for a widget's parameters."""
    properties: dict[str, Any] = {}
    required: list[str] = []

    for param in widget.params:
        schema, is_required = _param_schema(param)
        properties[param.name] = schema
        if is_required:
            required.append(param.name)

    widget_schema: dict[str, Any] = {
        "type": "object",
        "title": widget.name,
        "properties": properties,
        "additionalProperties": False,
    }
    if required:
        widget_schema["required"] = required

    return widget_schema


def _slugify(value: str) -> str:
    slug = re.sub(r"[^0-9A-Za-z]+", "_", value).strip("_")
    return slug.lower() or "value"


def build_widget_tool_name(widget: Widget) -> str:
    """Generate a deterministic (and reasonably short) widget tool name.

    Names always start with the ``openbb_widget`` prefix so Workspace can route
    them, followed by the widget identifier.
    """
    widget_slug = _slugify(widget.widget_id)
    return f"openbb_widget_{widget_slug}"


def build_widget_tool_def(
    widget: Widget, tool_name_override: str | None = None
) -> ToolDefinition:
    """Create a ToolDefinition for a deferred widget tool."""

    tool_name = tool_name_override or build_widget_tool_name(widget)
    schema = _widget_schema(widget)
    description = widget.description or widget.name

    return ToolDefinition(
        name=tool_name,
        parameters_json_schema=schema,
        description=description,
    )


class WidgetToolset(ExternalToolset[OpenBBDeps]):
    """External toolset that exposes widgets as deferred tools."""

    def __init__(self, widgets: Sequence[Widget], reserved_names: set[str] | None = None):
        self.widgets_by_tool: dict[str, Widget] = {}
        # We start with reserved_names, but we want to track NEW names we add to avoid internal collisions too.
        # So 'used_names' tracks everything.
        self.used_names: set[str] = set(reserved_names) if reserved_names else set()
        
        tool_defs: list[ToolDefinition] = []

        for widget in widgets:
            base_name = build_widget_tool_name(widget)
            name = base_name
            counter = 1
            # Check against ALL used/reserved names
            while name in self.used_names:
                counter += 1
                name = f"{base_name}_{counter}"

            self.used_names.add(name)

            tool_def = build_widget_tool_def(widget, tool_name_override=name)
            tool_defs.append(tool_def)
            self.widgets_by_tool[tool_def.name] = widget

        super().__init__(tool_defs)


def build_widget_toolsets(
    collection: WidgetCollection | None,
) -> tuple[AbstractToolset[OpenBBDeps], ...]:
    """Create toolsets for each widget priority group.

    Widgets are organized into separate toolsets by priority (primary, secondary, extra)
    to allow control over tool selection.
    """
    if collection is None:
        collection = WidgetCollection()

    toolsets: list[AbstractToolset[OpenBBDeps]] = []
    
    # Track which IDs we've seen to prevent duplicate processing of the SAME widget object across groups
    seen_ids: set[str] = set()
    # Track reserved names across toolsets to prevent Slug collisions
    global_used_names: set[str] = set()

    for widgets in (collection.primary, collection.secondary, collection.extra):
        if not widgets:
            continue
            
        # 1. Deduplicate by Widget ID first
        unique_widgets = []
        for w in widgets:
            if w.widget_id not in seen_ids:
                unique_widgets.append(w)
                seen_ids.add(w.widget_id)
        
        if not unique_widgets:
            continue

        # 2. Create toolset with awareness of previously used names
        ts = WidgetToolset(unique_widgets, reserved_names=global_used_names)
        toolsets.append(ts)
        
        # 3. Update global registry with names this toolset claimed
        global_used_names.update(ts.used_names)

    return tuple(toolsets)
