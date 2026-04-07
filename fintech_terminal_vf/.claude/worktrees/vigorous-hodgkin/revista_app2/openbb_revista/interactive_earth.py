import aiohttp
import os
from .constants import REVISTA_BASE_URL

async def get_interactive_earth(property_id): 
    api_key = os.getenv("REVISTA_API_KEY")
    # Review: "The Result: Your maps will fail because they are looking for a variable that doesn't exist in your .env."
    # Fix: Look for GOOGLE_MAPS_API_KEY
    google_key = os.getenv("GOOGLE_MAPS_API_KEY")

    if not api_key: return "### REVISTA_API_KEY Missing"

    # 1. Fetch Property Location 
    rev_url = f"{REVISTA_BASE_URL}/Property/{property_id}?ApiKey={api_key}" 
    async with aiohttp.ClientSession() as session:
        async with session.get(rev_url) as resp:
            if resp.status != 200: return "### Property Not Found" 
            data = await resp.json() 
     
    lat = data.get('lat') 
    lon = data.get('lon') 
     
    if not lat or not lon: 
        return "### No Coordinates Available" 
 
    if not google_key: 
        return "### GOOGLE_MAPS_API_KEY Required for Interactive Mode" 
 
    # 2. Generate Interactive HTML Map 
    # We embed a Google Map with 45-degree imagery (Tilt) enabled 
     
    html_content = f""" 
    <!DOCTYPE html> 
    <html> 
      <head> 
        <style> 
          #map {{ 
            height: 100%; 
            width: 100%; 
            border-radius: 8px; 
          }} 
          html, body {{ 
            height: 100%; 
            margin: 0; 
            padding: 0; 
          }} 
        </style> 
        <script> 
          function initMap() {{ 
            const propertyLoc = {{ lat: {lat}, lng: {lon} }}; 
             
            // Initialize Map with 45-degree Tilt (Satellite) 
            const map = new google.maps.Map(document.getElementById("map"), {{ 
              center: propertyLoc, 
              zoom: 18, 
              mapTypeId: "satellite", 
              tilt: 45, // Enables 3D perspective 
              heading: 0, // Start facing North 
              disableDefaultUI: true, // Clean look 
              zoomControl: true, // Keep zoom 
              fullscreenControl: true // Allow full screen 
            }}); 
 
            // Add Marker for Subject Property 
            new google.maps.Marker({{ 
              position: propertyLoc, 
              map: map, 
              title: "{data.get('propertyName')}", 
              animation: google.maps.Animation.DROP 
            }}); 
          }} 
        </script> 
      </head> 
      <body> 
        <div id="map"></div> 
        <!-- Load Google Maps API asynchronously --> 
        <script 
          src="https://maps.googleapis.com/maps/api/js?key={google_key}&callback=initMap&v=weekly" 
          async 
        ></script> 
      </body> 
    </html> 
    """ 
     
    return html_content 
