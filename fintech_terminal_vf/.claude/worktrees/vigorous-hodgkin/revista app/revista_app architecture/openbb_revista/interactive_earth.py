import aiohttp
import os
from .constants import REVISTA_BASE_URL

async def get_interactive_earth(property_id): 
    api_key = os.getenv("REVISTA_API_KEY")
    google_key = os.getenv("GOOGLE_MAPS_API_KEY")

    if not api_key: return "<h3>REVISTA_API_KEY Missing</h3>"

    # 1. Fetch Property Location 
    rev_url = f"{REVISTA_BASE_URL}/Property/{property_id}?ApiKey={api_key}" 
    async with aiohttp.ClientSession() as session:
        async with session.get(rev_url) as resp:
            if resp.status != 200: return "<h3>Property Not Found</h3>" 
            raw_data = await resp.json()
            data = raw_data.get('value', raw_data) 
     
    lat = data.get('lat') 
    lon = data.get('lon') 
     
    if not lat or not lon: 
        return "<h3>No Coordinates Available</h3>" 
 
    if not google_key: 
        return f"""
        <div style='padding: 20px; text-align: center;'>
            <h3>Google Maps API Key Required</h3>
            <p>Property Location: {lat}, {lon}</p>
            <p>Property: {data.get('propertyName', 'Unknown')}</p>
            <p style='color: #666; margin-top: 20px;'>
                Set GOOGLE_MAPS_API_KEY in .env to enable interactive map
            </p>
        </div>
        """ 
 
    # 2. Generate Interactive HTML Map  
    # Using standard string with % formatting to avoid f-string escaping issues with JS code
    # Returning a fragment (div + script) instead of full HTML document for better embedding compatibility
    html_content = """ 
    <script>
    (function() {
        const mapId = "map_container_%s";
        const loadingId = "loading_%s";
        const debugId = "debug_%s";
        const lat = %s;
        const lon = %s;
        const title = "%s";
        
        function updateDebug(msg) {
            const debugEl = document.getElementById(debugId);
            if (debugEl) debugEl.innerText = msg;
        }

        // Handle Google Maps Auth Errors (Global Callback)
        window.gm_authFailure = function() {
            updateDebug("Error: Google Maps Authentication Failed. Check API Key.");
            const loading = document.getElementById(loadingId);
            if (loading) {
                loading.innerHTML = '<div style="color: red; font-weight: bold;">Auth Failed</div><div style="font-size: 10px;">Invalid API Key</div>';
            }
        };

        function initWidgetMap() {
            updateDebug("Initializing map...");
            const container = document.getElementById(mapId);
            const loading = document.getElementById(loadingId);
            
            if (!container) {
                updateDebug("Error: Map container not found");
                return;
            }

            try {
                if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
                    updateDebug("Error: Google Maps API not loaded");
                    return;
                }

                const propertyLoc = { lat: lat, lng: lon };
                const map = new google.maps.Map(container, {
                    center: propertyLoc,
                    zoom: 19,
                    mapTypeId: "satellite",
                    tilt: 45,
                    heading: 0,
                    zoomControl: true,
                    fullscreenControl: true,
                    streetViewControl: false,
                    mapTypeControl: false
                });

                new google.maps.Marker({
                    position: propertyLoc,
                    map: map,
                    title: title,
                    animation: google.maps.Animation.DROP
                });

                if (loading) loading.style.display = 'none';
                updateDebug(""); // Clear debug if successful
            } catch (e) {
                if (loading) {
                    loading.innerHTML = 'Error: ' + e.message;
                    loading.style.color = 'red';
                }
                updateDebug("Exception: " + e.message);
                console.error("Map Error:", e);
            }
        }

        // Poll for Google Maps API
        let attempts = 0;
        function checkGoogleMaps() {
            attempts++;
            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                initWidgetMap();
            } else {
                updateDebug("Waiting for Google Maps API... (" + attempts + ")");
                if (attempts < 50) { // Timeout after 5 seconds
                    setTimeout(checkGoogleMaps, 100);
                } else {
                    updateDebug("Error: Google Maps API timeout. Check API Key or Network.");
                }
            }
        }

        checkGoogleMaps();
    })();
    </script>
    
    <!-- Load Google Maps API (Standard Tag) -->
    <script src="https://maps.googleapis.com/maps/api/js?key=%s" async defer></script>
    
    <div style="width: 100%%; height: 100%%; min-height: 400px; position: relative;">
        <div id="map_container_%s" style="width: 100%%; height: 100%%;"></div>
        <div id="loading_%s" style="position: absolute; top: 50%%; left: 50%%; transform: translate(-50%%, -50%%); background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px; z-index: 10; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; margin-bottom: 5px;">Loading Map...</div>
            <div id="debug_%s" style="font-size: 12px; color: #666;">Starting...</div>
        </div>
    </div>
    """ % (property_id, property_id, property_id, lat, lon, data.get('propertyName', 'Property').replace('"', '\\"'), google_key, property_id, property_id, property_id)
     
    return html_content 
