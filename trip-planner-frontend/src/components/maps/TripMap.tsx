"use client"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"

const Map = dynamic(() => import("react-map-gl"), { ssr: false })
const Marker = dynamic(() => import("react-map-gl").then((mod) => mod.Marker), { ssr: false })
const Source = dynamic(() => import("react-map-gl").then((mod) => mod.Source), { ssr: false })
const Layer = dynamic(() => import("react-map-gl").then((mod) => mod.Layer), { ssr: false })
import "mapbox-gl/dist/mapbox-gl.css"

interface TripMapProps {
  trip: any
  stops: any[]
}

export default function TripMap({ trip, stops }: TripMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string
  const [viewState, setViewState] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 5,
  })

  // Set initial view state based on trip data
  useEffect(() => {
    if (trip?.current_location?.coordinates) {
      setViewState({
        latitude: trip.current_location.coordinates.lat,
        longitude: trip.current_location.coordinates.lng,
        zoom: 8,
      })
    }
  }, [trip])

  // Prepare route data - with additional validation and logging
  const routeData = useMemo(() => {
    if (trip?.route?.route_data) {
      console.log("Route data available:", trip.route.route_data);
      
      // Check if we have a valid geometry
      if (!trip.route.route_data.geometry ||
          !trip.route.route_data.geometry.type ||
          !trip.route.route_data.geometry.coordinates) {
        console.error("Invalid route geometry:", trip.route.route_data.geometry);
        return null;
      }
      
      // Make sure we're returning a proper GeoJSON object
      return {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: trip.route.route_data.geometry.coordinates
        }
      }
    }
    return null
  }, [trip])

  // Calculate a route if one isn't provided but we have stops
  const calculatedRouteData = useMemo(() => {
    // Only calculate if we don't have a route but have current location and at least one stop
    if (!routeData && trip?.current_location?.coordinates && stops && stops.length > 0) {
      // Create a simple straight-line route between points
      const coordinates = [];
      
      // Start with current location
      coordinates.push([
        trip.current_location.coordinates.lng,
        trip.current_location.coordinates.lat
      ]);
      
      // Add all stops in order (assuming they're already sorted)
      stops.forEach(stop => {
        if (stop.location && stop.location.coordinates) {
          coordinates.push([
            stop.location.coordinates.lng,
            stop.location.coordinates.lat
          ]);
        }
      });
      
      // Only create a route if we have at least 2 points
      if (coordinates.length >= 2) {
        return {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates
          }
        };
      }
    }
    return null;
  }, [routeData, trip, stops]);

  // Calculate bounds to fit all markers
  useEffect(() => {
    if (stops && stops.length > 0) {
      // Collect all coordinates
      const points = [];
      
      // Add current location
      if (trip?.current_location?.coordinates) {
        points.push([
          trip.current_location.coordinates.lng,
          trip.current_location.coordinates.lat
        ]);
      }
      
      // Add all stops
      stops.forEach(stop => {
        if (stop.location && stop.location.coordinates) {
          points.push([
            stop.location.coordinates.lng,
            stop.location.coordinates.lat
          ]);
        }
      });
      
      // If we have points, calculate bounds
      if (points.length > 0) {
        // Simple calculation for demo - in production use a library like @turf/bbox
        const lngs = points.map(p => p[0]);
        const lats = points.map(p => p[1]);
        
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        
        // Center point
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        
        // Calculate zoom - this is approximate
        const lngDiff = maxLng - minLng;
        const latDiff = maxLat - minLat;
        const maxDiff = Math.max(lngDiff, latDiff);
        const zoom = Math.max(2, 8 - Math.log2(maxDiff * 100));
        
        setViewState({
          latitude: centerLat,
          longitude: centerLng,
          zoom: zoom,
        });
      }
    }
  }, [trip, stops]);

  if (!mapboxToken) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-gray-100">
        <p className="text-red-500">
          Mapbox token is missing. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your environment.
        </p>
      </div>
    )
  }

  return (
    <div className="h-[500px] border rounded-lg overflow-hidden">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={mapboxToken}
      >
        {/* Use the provided route or calculated route */}
        {(routeData || calculatedRouteData) && (
          <Source id="route" type="geojson" data={routeData || calculatedRouteData}>
            <Layer
              id="routeLayer"
              type="line"
              layout={{"line-join": "round", "line-cap": "round"}}
              paint={{
                "line-color": "#ffd700",
                "line-width": 4,
                "line-opacity": 0.8
              }}
            />
          </Source>
        )}

        {/* Current location marker */}
        {trip?.current_location?.coordinates && (
          <Marker latitude={trip.current_location.coordinates.lat} longitude={trip.current_location.coordinates.lng}>
            <div className="bg-blue-600 text-white rounded-full p-2 text-xs shadow-md flex items-center justify-center h-8 w-8">
              <span className="font-bold">C</span>
            </div>
          </Marker>
        )}

        {/* Stops markers */}
        {stops &&
          stops.map(
            (stop) =>
              stop.location &&
              stop.location.coordinates && (
                <Marker
                  key={stop.id}
                  latitude={stop.location.coordinates.lat}
                  longitude={stop.location.coordinates.lng}
                >
                  <div
                    className={`
                      rounded-full p-2 text-xs text-white shadow-md flex items-center justify-center h-8 w-8
                      ${
                        stop.stop_type === "pickup"
                          ? "bg-green-500"
                          : stop.stop_type === "dropoff"
                            ? "bg-red-500"
                            : stop.stop_type === "rest"
                              ? "bg-yellow-500"
                              : "bg-purple-500"
                      }
                    `}
                  >
                    <span className="font-bold">
                      {stop.stop_type === "pickup"
                        ? "P"
                        : stop.stop_type === "dropoff"
                          ? "D"
                          : stop.stop_type === "rest"
                            ? "R"
                            : "F"}
                    </span>
                  </div>
                </Marker>
              ),
          )}
      </Map>
    </div>
  )
}