"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateTrip } from "@/hooks/useTripData";
import { Button } from "@/components/ui/button";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_SECRET_MAPBOX_TOKEN

async function geocodeLocation(address: string) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return { lat: 0, lng: 0 }; // Default coordinates if geocoding fails
}

export default function HomePage() {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [currentCycleHours, setCurrentCycleHours] = useState<number>(0);
  const createTripMutation = useCreateTrip();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const [currentCoords, pickupCoords, dropoffCoords] = await Promise.all([
        geocodeLocation(currentLocation),
        geocodeLocation(pickupLocation),
        geocodeLocation(dropoffLocation),
      ]);

      const payload = {
        current_location: { address: currentLocation, coordinates: currentCoords },
        pickup_location: { address: pickupLocation, coordinates: pickupCoords },
        dropoff_location: { address: dropoffLocation, coordinates: dropoffCoords },
        current_cycle_hours: currentCycleHours,
      };

      const data = await createTripMutation.mutateAsync(payload);
      router.push(`/trips/${data.id}`);
    } catch (error) {
      console.error("Failed to create trip", error);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Plan Your Trip</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Current Location</label>
          <input
            type="text"
            value={currentLocation}
            onChange={(e) => setCurrentLocation(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Enter current location"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Pickup Location</label>
          <input
            type="text"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Enter pickup location"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Dropoff Location</label>
          <input
            type="text"
            value={dropoffLocation}
            onChange={(e) => setDropoffLocation(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Enter dropoff location"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Current Cycle Hours Used</label>
          <input
            type="number"
            value={currentCycleHours}
            onChange={(e) => setCurrentCycleHours(Number(e.target.value))}
            className="w-full border rounded p-2"
            placeholder="Enter cycle hours"
            required
          />
        </div>
        <Button type="submit">Plan Trip</Button>
      </form>
    </div>
  );
}
