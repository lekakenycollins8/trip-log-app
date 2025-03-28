// src/components/maps/TripMap.tsx
"use client";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";

const Map = dynamic(() => import('react-map-gl'), { ssr: false });
const Marker = dynamic(() => import('react-map-gl').then(mod => mod.Marker), { ssr: false });
const Source = dynamic(() => import('react-map-gl').then(mod => mod.Source), { ssr: false });
const Layer = dynamic(() => import('react-map-gl').then(mod => mod.Layer), { ssr: false });
import 'mapbox-gl/dist/mapbox-gl.css';

interface TripMapProps {
  trip: any;
  stops: any[];
}

export default function TripMap({ trip, stops }: TripMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

  // Prepare route data (assumes trip.route_data exists)
  const routeData = useMemo(() => {
    if (trip?.route?.route_data) {
      return trip.route.route_data;
    }
    return null;
  }, [trip]);

  return (
    <Map
      initialViewState={{
        latitude: trip.current_location.coordinates.lat || 37.7749,
        longitude: trip.current_location.coordinates.lng || -122.4194,
        zoom: 10,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      mapboxAccessToken={mapboxToken}
    >
      {routeData && (
        <Source id="route" type="geojson" data={routeData.geometry}>
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
      {stops &&
        stops.map((stop) => (
          <Marker
            key={stop.id}
            latitude={stop.location.coordinates.lat}
            longitude={stop.location.coordinates.lng}
          >
            <div className="bg-blue-500 text-white rounded-full p-1 text-xs">
              {stop.stop_type[0].toUpperCase()}
            </div>
          </Marker>
        ))}
    </Map>
  );
}