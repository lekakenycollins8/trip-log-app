// src/app/trips/[id].tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useTrip, useStops, useCalculateRoute } from "@/hooks/useTripData";
import TripMap from "@/components/maps/TripMap";
import { Button } from "@/components/ui/button";

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = params.id as string;
  const router = useRouter();

  const { data: trip, isLoading: tripLoading, error: tripError } = useTrip(tripId);
  const { data: stops, isLoading: stopsLoading } = useStops(tripId);
  const calculateRouteMutation = useCalculateRoute(tripId);

  const handleRecalculateRoute = async () => {
    try {
      await calculateRouteMutation.mutateAsync();
      // Optionally, trigger a refetch of the trip details
    } catch (error) {
      console.error("Route recalculation failed", error);
    }
  };

  if (tripLoading || stopsLoading) return <div>Loading...</div>;
  if (tripError) return <div>Error loading trip details.</div>;

  return (
    <div className="flex flex-col md:flex-row">
      {/* Main map area */}
      <div className="flex-1">
        <TripMap trip={trip} stops={stops} />
      </div>
      {/* Sidebar panel */}
      <div className="w-full md:w-1/3 p-4 border-l">
        <h2 className="text-xl font-bold mb-4">Trip Summary</h2>
        <p><strong>Pickup:</strong> {trip.pickup_location.address}</p>
        <p><strong>Dropoff:</strong> {trip.dropoff_location.address}</p>
        <p><strong>Cycle Hours:</strong> {trip.current_cycle_hours}</p>
        <p><strong>Estimated Distance:</strong> {trip.estimated_distance} miles</p>
        <p><strong>Estimated Duration:</strong> {trip.estimated_duration} hours</p>
        <Button onClick={handleRecalculateRoute} className="mt-4">
          Recalculate Route
        </Button>
        <Button onClick={() => router.push(`/trips/${tripId}/logs`)} className="mt-2">
          View Log Sheet
        </Button>
      </div>
    </div>
  );
}