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

  // Prepare route data
  const routeData = useMemo(() => {
    if (trip?.route?.route_data) {
      // Make sure we're returning a proper GeoJSON object
      return {
        type: "Feature",
        properties: {},
        geometry: trip.route.route_data.geometry,
      }
    }
    return null
  }, [trip])

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
        {routeData && (
          <Source id="route" type="geojson" data={routeData}>
            <Layer
              id="routeLayer"
              type="line"
              paint={{
                "line-color": "#3887be",
                "line-width": 4,
              }}
            />
          </Source>
        )}

        {/* Current location marker */}
        {trip?.current_location?.coordinates && (
          <Marker latitude={trip.current_location.coordinates.lat} longitude={trip.current_location.coordinates.lng}>
            <div className="bg-blue-600 text-white rounded-full p-2 text-xs">Current</div>
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
                rounded-full p-2 text-xs text-white
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
                    {stop.stop_type === "pickup"
                      ? "P"
                      : stop.stop_type === "dropoff"
                        ? "D"
                        : stop.stop_type === "rest"
                          ? "R"
                          : "F"}
                  </div>
                </Marker>
              ),
          )}
      </Map>
    </div>
  )
}