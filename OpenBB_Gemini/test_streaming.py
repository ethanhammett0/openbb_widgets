import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
if os.getenv("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")

from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel

async def main():
    print("Initializing GeminiModel('gemini-3-pro-preview')...")
    model = GeminiModel("gemini-3-pro-preview")
    agent = Agent(model)
    print("Starting stream...")
    
    try:
        async with agent.run_stream("Hello Gemini 3") as result:
            print("Stream started.")
            async for chunk in result.stream():
                print(f"Chunk: {chunk}")
        print("✅ Streaming complete.")
    except Exception as e:
        print(f"❌ Streaming Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
