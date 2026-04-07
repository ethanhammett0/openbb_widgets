import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Duplicate key to both vars just in case
if os.getenv("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")

print(f"Key: {os.getenv('GEMINI_API_KEY', '')[:5]}...")

from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel

async def main():
    print("Initializing GeminiModel('gemini-3-pro-preview')...")
    try:
        model = GeminiModel("gemini-3-pro-preview")
        agent = Agent(model)
        print("Running agent...")
        result = await agent.run("Hello, are you Gemini 3?")
        print(f"✅ Success! Response: {result.data}")
    except TypeError as te:
         print(f"❌ TypeError: {te}")
         import inspect
         print(f"Signature: {inspect.signature(GeminiModel.__init__)}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
