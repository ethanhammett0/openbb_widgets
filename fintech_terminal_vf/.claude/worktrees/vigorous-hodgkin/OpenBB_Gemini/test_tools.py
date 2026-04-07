import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
if os.getenv("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")

from pydantic_ai import Agent, RunContext
from pydantic_ai.models.gemini import GeminiModel

async def main():
    print("Initializing GeminiModel('gemini-3-pro-preview')...")
    model = GeminiModel("gemini-3-pro-preview")
    agent = Agent(model)

    @agent.tool
    def get_weather(ctx: RunContext, city: str) -> str:
        return f"Weather in {city} is Sunny, 25C"

    print("Running agent with tool...")
    try:
        # Ask something triggering the tool
        result = await agent.run("What is the weather in London?")
        print(f"✅ Success! Response: {result.data}")
        # Verify tool usage
        print(f"Tool usage count: {len(result.usage().get('tool_calls', [])) if hasattr(result, 'usage') else 'Unknown'}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
