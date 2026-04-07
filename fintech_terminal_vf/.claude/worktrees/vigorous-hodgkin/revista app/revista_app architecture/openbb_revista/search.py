import pandas as pd 
import aiohttp
import re 
import os
from .constants import NOMINATIM_URL, REVISTA_BASE_URL, USER_AGENT

async def search_revista(query): 
    """ 
    Enhanced search:
    1. Checks if query is a Property ID (numeric) -> Direct Lookup
    2. Checks if query is an Address -> Geocode + Radius Search
    3. Checks if query is a Name -> Geocode (if possible) + Name Filter
    """
    api_key = os.getenv("REVISTA_API_KEY")
    if not api_key:
        return pd.DataFrame({"Error": ["REVISTA_API_KEY not found"]})
    
    # CASE 1: Direct Property ID Lookup
    if str(query).strip().isdigit():
        property_id = str(query).strip()
        try:
            url = f"{REVISTA_BASE_URL}/Property/{property_id}?ApiKey={api_key}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        raw_data = await resp.json()
                        data = raw_data.get('value', raw_data)
                        if data:
                            df = pd.DataFrame([data])
                            df = df.rename(columns={'propertyID': 'property_id'})
                            available_cols = ['property_id', 'propertyName', 'address', 'city', 'stateProvince', 'zip', 'propertyType']
                            cols_to_show = [col for col in available_cols if col in df.columns]
                            return df[cols_to_show]
        except Exception as e:
            pass # Fall through to regular search if ID lookup fails
            
    # CASE 2 & 3: Address or Name Search via Geocoding
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
 
    # Step 3: Revista Search with 10-mile radius (to get more results)
    try: 
        rev_url = f"{REVISTA_BASE_URL}/Property/Search/{lat}/{lon}?ApiKey={api_key}&radius=10" 
        async with aiohttp.ClientSession() as session:
            async with session.get(rev_url) as resp:
                raw_data = await resp.json()
                data = raw_data.get('value', raw_data)
        
        if isinstance(data, dict):
            data = [data]
        elif data is None:
            data = []
            
        df = pd.DataFrame(data) 
         
        if df.empty: 
            return pd.DataFrame({"Info": ["No properties found in this area."]}) 
             
        # Rename column to match Widget Inputs 
        df = df.rename(columns={'propertyID': 'property_id'}) 
        
        # Filter by property name if query looks like a property name (not an address)
        if not any(char.isdigit() for char in query) and len(query.split()) > 1:
            # Likely a property name search
            name_filtered = df[df['propertyName'].str.contains(query, case=False, na=False)]
            if not name_filtered.empty:
                df = name_filtered
         
        # Select columns including city, state, zip
        available_cols = ['property_id', 'propertyName', 'address', 'city', 'stateProvince', 'zip', 'propertyType']
        cols_to_show = [col for col in available_cols if col in df.columns]
        
        return df[cols_to_show].head(50)  # Limit to 50 results
 
    except Exception as e: 
        return pd.DataFrame({"Error": [str(e)]}) 
