import pandas as pd 
import aiohttp
import re 
import os
from .constants import NOMINATIM_URL, REVISTA_BASE_URL, USER_AGENT

async def search_revista(query): 
    """ 
    Robust Geocoding with AUTO-LINKING fix. 
    Renames 'propertyID' -> 'property_id' so dashboard widgets update on click. 
    """
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key:
        return pd.DataFrame({"Error": ["REVISTA_API_KEY not found"]})
     
    async def get_lat_lon(search_term): 
        try: 
            headers = {'User-Agent': USER_AGENT} 
            params = {'q': search_term, 'format': 'json', 'limit': 1} 
            url = NOMINATIM_URL
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, headers=headers) as resp:
                    data = await resp.json() 
                    if data: return data[0]['lat'], data[0]['lon'] 
            return None, None 
        except: return None, None 
 
    # Step 1: Clean Address 
    clean_query = re.sub(r'(?i)(suite|ste|unit|fl|floor|bldg|building|#)\s*\w*', '', query) 
     
    # Step 2: Geocode (Cascade) 
    lat, lon = await get_lat_lon(clean_query) 
    if not lat: 
        zip_match = re.search(r'\b\d{5}\b', query) 
        if zip_match: lat, lon = await get_lat_lon(zip_match.group(0)) 
    if not lat and "," in query: 
        lat, lon = await get_lat_lon(",".join(query.split(',')[-2:])) 
 
    if not lat: 
        return pd.DataFrame({"Error": [f"Could not locate '{query}'."]}) 
 
    # Step 3: Revista Search 
    try: 
        rev_url = f"{REVISTA_BASE_URL}/Property/Search/{lat}/{lon}?ApiKey={api_key}" 
        async with aiohttp.ClientSession() as session:
            async with session.get(rev_url) as resp:
                data = await resp.json() 
        df = pd.DataFrame(data) 
         
        if df.empty: 
            return pd.DataFrame({"Info": ["No properties found in this area."]}) 
             
        # CRITICAL FIX: Rename column to match Widget Inputs 
        df = df.rename(columns={'propertyID': 'property_id'}) 
         
        return df[['property_id', 'propertyName', 'address', 'propertyType', 'distance']] 
 
    except Exception as e: 
        return pd.DataFrame({"Error": [str(e)]}) 
