import asyncio
import os
from dotenv import load_dotenv
from openbb_revista.interactive_earth import get_interactive_earth

# Load environment variables
load_dotenv()

async def verify():
    property_id = "570571" # Example ID
    print(f"Testing Interactive Earth for Property ID: {property_id}")
    
    # Check keys
    print(f"REVISTA_API_KEY present: {bool(os.getenv('REVISTA_API_KEY'))}")
    print(f"GOOGLE_MAPS_API_KEY present: {bool(os.getenv('GOOGLE_MAPS_API_KEY'))}")
    
    try:
        html = await get_interactive_earth(property_id)
        
        if "Google Maps API Key Required" in html:
            print("FAILURE: Google Maps API Key missing or not detected.")
        elif "Property Not Found" in html:
            print("FAILURE: Property not found (check Revista API key or ID).")
        elif "No Coordinates Available" in html:
            print("FAILURE: Property found but no coordinates.")
        elif "<!DOCTYPE html>" in html and "google.maps.Map" in html:
            print("SUCCESS: HTML generated correctly.")
            # Optional: Print a snippet to confirm
            print("Snippet:", html[:200].replace('\n', ' '))
        else:
            print("UNKNOWN RESPONSE:", html[:100])
            
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
