import pandas as pd 
import aiohttp
import os
from .constants import REVISTA_BASE_URL

async def get_stakeholders(property_id): 
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key: return pd.DataFrame()

    url = f"{REVISTA_BASE_URL}/Property/Stakeholders/{property_id}?ApiKey={api_key}" 
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200: return pd.DataFrame() 
            raw_data = await resp.json()
            data = raw_data.get('value', raw_data)
     
    return pd.DataFrame(data) 
     
    if df.empty: 
        return pd.DataFrame({"Info": ["No stakeholders found"]}) 
 
    # Clean up columns for a readable table 
    cols = ['stakeholderName', 'stakeholderType', 'ownershipType', 'contactName', 'contactEmail'] 
    # Filter to ensure we only select columns that actually exist in the data 
    final_cols = [c for c in cols if c in df.columns] 
     
    return df[final_cols] 
