import requests
from django.conf import settings

MAPBOX_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"

class MapboxService:
    @staticmethod
    def get_route(origin, destination, waypoints=None):
        """Fetches optimized route from Mapbox Directions API
        Args:
            :param origin: Tuple of (lat, lng) coordinates for origin
            :param destination: Tuple of (lat, lng) coordinates for destination
            :param waypoints: List of Tuple of (lat, lng) for intermediate stops
            :return: Dictionary with route data or raises exception if not found
        """
        access_token = settings.MAPBOX_API_KEY
        if not access_token:
            raise Exception("Mapbox API key not found/ Not configured")
        
        # Build coordinate string: origin;waypoint1;waypoint2;destination (Mapbox expects lng,lat)
        coords = [f"{origin[1]},{origin[0]}"] # lng,lat
        if waypoints:
            coords += [f"{waypoint[1]},{waypoint[0]}" for waypoint in waypoints] # lng,lat
        coords.append(f"{destination[1]},{destination[0]}") # lng,lat
        coordinates = ";".join(coords)

        # Build URL parameters
        params = {
            "access_token": access_token,
            "geometries": "geojson",
            "steps": "true",
            "overview": "full",
        }

        url = f"{MAPBOX_BASE_URL}/{coordinates}"
        response = requests.get(url, params=params)
        if response.status_code != 200:
            raise Exception(f"Mapbox API Error: {response.status_code} {response.text}")
        
        data = response.json()

        if not data.get('routes'): # Check for 'routes' key as a string
            raise Exception("No route for given addresses")

        # Return first route from response
        return data['routes'][0]

def get_coordinates(location_json):
    """Extracts lat, lng coordinates from location JSON
    Expected format: {"address": "...", "coordinates": {"lat": ..., "lng": ...}}
    """
    coordinates = location_json.get("coordinates")
    if coordinates and "lat" in coordinates and "lng" in coordinates:
        return (coordinates["lat"], coordinates["lng"])
    else:
        raise Exception("Invalid coordinates in location JSON; Coordinates missing")