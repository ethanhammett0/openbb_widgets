from memory_tool import save_memory, search_memory, read_memory, get_memory_signal
import shutil
import os

# Clean up
if os.path.exists("agent_memory_index.json"):
    os.remove("agent_memory_index.json")
if os.path.exists("memory_chapters"):
    shutil.rmtree("memory_chapters")

print(">>> 1. Saving Memories...")
print(save_memory(
    source_tool="google_search",
    source_args={"query": "HRE Trends"},
    value={"data": "Big long JSON data about HRE..."},
    summary="[HRE, Trends, 2024, Cap-Rates]",
    topic="Market Data"
))

print(save_memory(
    source_tool="revista",
    source_args={"id": "123"},
    value={"name": "Kindred Hospital", "beds": 100},
    summary="[Revista, Kindred, Beds: 100]",
    topic="Property Details"
))

print("\n>>> 2. Checking Signal (Context Window Cost)...")
print(get_memory_signal())

print("\n>>> 3. Searching Index (RAG Step 1)...")
results = search_memory(query="HRE")
print(results)

print("\n>>> 4. Reading Full Data (RAG Step 2)...")
# Extract ID from results (mocking agent behavior)
# In real life agent parses the ID. Here we just assume we found one.
# Let's search specifically to get the ID line
if "ID: `" in results:
    import re
    match = re.search(r"ID: `([^`]+)`", results)
    if match:
        mem_id = match.group(1)
        print(f"Found ID: {mem_id}")
        data = read_memory(mem_id)
        print(f"Recovered Data: {data}")
    else:
        print("Could not parse ID from results.")
else:
    print("No results to read.")
