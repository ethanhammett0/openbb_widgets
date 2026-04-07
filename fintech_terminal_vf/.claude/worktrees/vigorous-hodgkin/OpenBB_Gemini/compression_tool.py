import os
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel

# Scanner Model (Flash) - High speed, low cost
# Using the experimental flash model as requested for "Engine A"
scanner_model = GoogleModel("gemini-2.0-flash-exp")
scanner_agent = Agent(scanner_model)

async def compress_data(raw_data: str, focus_topic: str) -> str:
    """
    Passes heavy data through the 'Scanner' (Gemini Flash) to extract signal.
    """
    # Safety cap to prevent blowing limits if raw_data is insanely huge, 
    # though Flash has a massive context window (1M+).
    # We'll trust the model handles it, but let's be reasonable.
    
    prompt = (
        f"You are a Data Scrubber (Engine A). Your goal is to extract signal from noise.\n"
        f"FOCUS TOPIC: {focus_topic}\n"
        f"INSTRUCTIONS:\n"
        f"1. Read the raw data below.\n"
        f"2. Extract ONLY facts, numbers, and dates relevant to the Focus Topic.\n"
        f"3. Discard ads, navigation links, and irrelevant fluff.\n"
        f"4. Output a dense Markdown table or bulleted list.\n"
        f"5. Do NOT converse. Just output the data.\n\n"
        f"RAW DATA:\n{raw_data}"
    )
    
    try:
        # We don't need tools for the scanner, just pure text processing
        result = await scanner_agent.run(prompt)
        return result.data
    except Exception as e:
        return f"[Compression Failed]: {str(e)}. Returning truncated raw data.\n\n{raw_data[:2000]}..."
