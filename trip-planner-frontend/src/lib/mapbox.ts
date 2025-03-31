/**
 * Geocodes an address to coordinates using Mapbox API
 * @param address The address to geocode
 * @returns Object with lat and lng properties
 */
export async function geocodeLocation(address: string) {
    const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  
    if (!address.trim()) {
      console.error("Empty address provided for geocoding")
      return { lat: 0, lng: 0 }
    }
  
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error("Mapbox token is missing")
      return { lat: 0, lng: 0 }
    }
  
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address,
    )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
  
    try {
      const response = await fetch(url)
  
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`)
      }
  
      const data = await response.json()
  
      if (data && data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        return { lat, lng }
      } else {
        console.warn("No geocoding results found for address:", address)
        return { lat: 0, lng: 0 }
      }
    } catch (error) {
      console.error("Geocoding error for address:", address, error)
      return { lat: 0, lng: 0 }
    }
} 