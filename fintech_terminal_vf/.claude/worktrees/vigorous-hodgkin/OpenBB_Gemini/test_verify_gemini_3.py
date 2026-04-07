import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
# Ensure both are set
if os.getenv("GOOGLE_API_KEY"):
    os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")

from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel

async def main():
    print(f"Testing Gemini 3 with Key: {os.getenv('GEMINI_API_KEY')[:5]}...")
    try:
        model = GeminiModel("gemini-3-pro-preview")
        agent = Agent(model)
        
        print("Sending request...")
        result = await agent.run("Hi")
        
        # PydanticAI 0.0.x vs 1.x difference? 
        # Inspect the result object type
        print(f"Result Type: {type(result)}")
        print(f"Result raw: {result}")
        
        if hasattr(result, 'data'):
            print(f"✅ DATA: {result.data}")
        elif hasattr(result, 'message'): # Legacy/beta API sometimes
             print(f"✅ MESSAGE: {result.message}")
             
    except Exception as e:
        print(f"❌ FATAL ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
