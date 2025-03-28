// src/app/trips/[id].tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useTrip, useStops, useCalculateRoute, useCreateStop } from "@/hooks/useTripData";
import TripMap from "@/components/maps/TripMap";
import { Button } from "@/components/ui/button";

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = params.id as string;
  const router = useRouter();

  const { data: trip, isLoading: tripLoading, error: tripError } = useTrip(tripId);
  const { data: stops, isLoading: stopsLoading } = useStops(tripId);
  const calculateRouteMutation = useCalculateRoute(tripId);
  const createStopMutation = useCreateStop(tripId);

  const handleRecalculateRoute = async () => {
    try {
      await calculateRouteMutation.mutateAsync();
      // Optionally, trigger a refetch of the trip details
    } catch (error) {
      console.error("Route recalculation failed", error);
    }
  };

  const handleCreateStop = async (event: any) => {
    event.preventDefault();
    const stopData = {
      trip: tripId, // Add the trip ID to the stopData
      location: { address: event.target.location.value },
      stop_type: event.target.stop_type.value,
      order: parseInt(event.target.order.value),
      arrival_time: event.target.arrival_time.value ? new Date(event.target.arrival_time.value).toISOString() : null,
      departure_time: event.target.departure_time.value ? new Date(event.target.departure_time.value).toISOString() : null,
    };

    try {
      await createStopMutation.mutateAsync(stopData);
      // Optionally, trigger a refetch of the stops
    } catch (error) {
      console.error("Stop creation failed", error);
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
        <Button onClick={async () => {
          await handleRecalculateRoute();
          router.push(`/trips/${tripId}/logs`);
        }} className="mt-2">
          View Log Sheet
        </Button>

        <h2 className="text-xl font-bold mb-4">Add Stop</h2>
        <form onSubmit={handleCreateStop}>
          <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
              Location
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="location" type="text" placeholder="Location" />
            </div>
            <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="stop_type">
              Stop Type
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="stop_type"
              name="stop_type"
              defaultValue=""
            >
              <option value="" disabled>Select a stop type</option>
              <option value="pickup">Pickup</option>
              <option value="dropoff">Dropoff</option>
              <option value="fueling">Fuel</option>
              <option value="rest">Rest</option>
            </select>
            </div>
            {createStopMutation.isSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
              Stop created successfully!
              </div>
            )}
            <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="order">
              Order
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="order" type="number" placeholder="Order" />
          </div>
          <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="arrival_time">
              Arrival Time
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="arrival_time" type="datetime-local" placeholder="Arrival Time" />
          </div>
          <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="departure_time">
              Departure Time
            </label>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="departure_time" type="datetime-local" placeholder="Departure Time" />
          </div>
          <Button type="submit" className="mt-4">
            Add Stop
          </Button>
        </form>
      </div>
    </div>
  );
}