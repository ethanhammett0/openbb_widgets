import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our new Vector Engine
from vector_store import VectorEngine

load_dotenv()

# --- CONFIGURATION ---
CHAPTERS_DIR = "memory_chapters"

# --- MODELS ---

class MemoryMetadata(BaseModel):
    unique_id: str
    timestamp: float
    source_tool: str
    source_args: Dict[str, Any]
    topic: str
    summary: str

class ChapterEntry(BaseModel):
    """The heavy object stored in chapter files."""
    metadata: MemoryMetadata
    value: Any

# --- HELPERS ---

def _ensure_paths():
    if not os.path.exists(CHAPTERS_DIR):
        os.makedirs(CHAPTERS_DIR)

def _append_to_chapter(topic: str, entry_data: Dict[str, Any]):
    """Appends an entry to a chapter file (JSON)."""
    _ensure_paths()
    safe_topic = "".join(c for c in topic if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_').lower()
    filename = f"{safe_topic}.json"
    path = os.path.join(CHAPTERS_DIR, filename)
    
    chapter_data = []
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                chapter_data = json.load(f)
        except:
            chapter_data = []
            
    chapter_data.append(entry_data)
    
    with open(path, "w") as f:
        json.dump(chapter_data, f, indent=2)

def _load_entry_from_chapter(topic: str, unique_id: str) -> Any:
    safe_topic = "".join(c for c in topic if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_').lower()
    filename = f"{safe_topic}.json"
    path = os.path.join(CHAPTERS_DIR, filename)
    
    if not os.path.exists(path):
        return None
        
    try:
        with open(path, "r") as f:
            data = json.load(f)
            for item in data:
                if item.get("metadata", {}).get("unique_id") == unique_id:
                    return item.get("value")
    except:
        return None
    return None

# --- TOOLS ---

def get_memory_signal() -> str:
    """
    Returns CONSTANT SIZE signal about memory state.
    """
    try:
        engine = VectorEngine()
        count = engine.count()
        
        if count == 0:
            return "Memory Bank: Empty."
        
        return (
            f"SYSTEM STATUS: ONLINE. Memory Bank: ACTIVE ({count} items).\n"
            "REMINDER: Assess intent first. If this is a Task, build a plan and execute. If this is Chat, be conversational."
        )
    except Exception as e:
        return f"Memory Error: {str(e)}"

def save_memory(
    source_tool: str,
    source_args: Dict[str, Any],
    value: Any,
    summary: str,
    topic: str = "General"
) -> str:
    """
    Saves high-value data into the Memory Bank (Vector Index + JSON Chapter).
    
    Args:
        source_tool: Name of the tool used.
        source_args: Arguments used.
        value: The FULL data object.
        summary: MANDATORY Description (e.g., "Analysis of HRE Cap Rates in Q3").
        topic: The Chapter (e.g., "Market Data").
    """
    _ensure_paths()
    
    unique_id = f"mem_{uuid.uuid4().hex[:8]}"
    timestamp = time.time()
    
    # 1. Prepare Metadata
    metadata_obj = MemoryMetadata(
        unique_id=unique_id,
        timestamp=timestamp,
        source_tool=source_tool,
        source_args=source_args,
        topic=topic,
        summary=summary
    )
    
    # 2. Save Heavy Payload to JSON (The "Book")
    entry = ChapterEntry(metadata=metadata_obj, value=value)
    _append_to_chapter(topic, entry.model_dump(mode='json'))
    
    # 3. Save Vector to Chroma (The "Brain")
    try:
        engine = VectorEngine()
        engine.add_memory(
            unique_id=unique_id,
            text=f"{topic}: {summary}", # Embed topic + summary for context
            metadata={
                "topic": topic,
                "timestamp": timestamp,
                "tool": source_tool
            }
        )
    except Exception as e:
        return f"Saved JSON but failed to index Vector: {str(e)}"
    
    return f"Saved to Memory. ID: `{unique_id}`. Topic: '{topic}'."

def search_memory(
    query: str,
    topic: Optional[str] = None,
    limit: int = 5
) -> str:
    """
    Semantic search for memories. Finds concepts, not just keywords.
    e.g. "Market Stability" will find "Vacancy Rates" and "Cap Rate Trends".
    
    Args:
        query: The concept to search for.
        topic: Optional filter.
        limit: Max results.
    """
    try:
        engine = VectorEngine()
        matches = engine.search(query, topic, limit)
    except Exception as e:
        return f"Search Error: {str(e)}"
    
    if not matches:
        return "No relevant memories found."
        
    output = ["Found Semantic Matches (Use `read_memory(id)` to retrieve):"]
    for m in matches:
        # m = {id, metadata, summary, distance}
        top = m['metadata'].get('topic', '?')
        ts = float(m['metadata'].get('timestamp', 0))
        date_str = time.strftime('%Y-%m-%d', time.localtime(ts)) if ts else "?"
        
        output.append(f"- ID: `{m['id']}` | Topic: {top} | Date: {date_str} | Relevance: {m['distance']:.2f}")
        output.append(f"  Summary: {m['summary']}")
        
    return "\n".join(output)

def read_memory(unique_id: str) -> Any:
    """
    Retrieves the FULL raw data for a specific Memory ID.
    """
    # 1. We need to know the topic to find the file.
    # In Pure Vector setup, we can re-query the ID in chroma or just search all files?
    # Searching all files is slow.
    # Better: Use the MemoryEngine to get the metadata for that ID.
    
    # Optimization: For now, let's just cheat and scan the 'memory_chapters' directory 
    # since we don't have a direct ID->Topic index without querying Chroma by ID.
    # Chroma `get` is fast.
    
    try:
        engine = VectorEngine()
        # Fetch metadata specifically for this ID
        results = engine.collection.get(ids=[unique_id])
        if not results['metadatas']:
             return f"Error: Memory ID '{unique_id}' not found in Vector Index."
             
        topic = results['metadatas'][0].get("topic")
        if not topic:
            return "Error: Topic missing from metadata."
            
        # Load from file
        val = _load_entry_from_chapter(topic, unique_id)
        if val is None:
            return f"Error: Data missing from Chapter '{topic}'."
            
        return val
        
    except Exception as e:
        # Fallback scan if Vector fail
        for filename in os.listdir(CHAPTERS_DIR):
            if filename.endswith(".json"):
                path = os.path.join(CHAPTERS_DIR, filename)
                try:
                    with open(path, "r") as f:
                        data = json.load(f)
                        for item in data:
                             if item.get("metadata", {}).get("unique_id") == unique_id:
                                 return item.get("value")
                except:
                    continue
        return f"Error: Memory ID '{unique_id}' not found (Fallback Scan failed)."
