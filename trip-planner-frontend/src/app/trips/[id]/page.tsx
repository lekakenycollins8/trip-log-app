"use client"

import type React from "react"

import { useParams, useRouter } from "next/navigation"
import { useTrip, useStops, useCalculateRoute, useCreateStop } from "@/hooks/useTripData"
import TripMap from "@/components/maps/TripMap"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export default function TripDetailsPage() {
  const params = useParams()
  const tripId = params.id as string
  const router = useRouter()
  const [isAddingStop, setIsAddingStop] = useState(false)

  const { data: trip, isLoading: tripLoading, error: tripError, refetch: refetchTrip } = useTrip(tripId)
  const { data: stops, isLoading: stopsLoading, refetch: refetchStops } = useStops(tripId)
  const calculateRouteMutation = useCalculateRoute(tripId)
  const createStopMutation = useCreateStop(tripId)

  useEffect(() => {
      if (trip && !trip.estimated_distance) {
        calculateRouteMutation.mutate();
      }
    }, [trip]);

  const handleRecalculateRoute = async () => {
    try {
      await calculateRouteMutation.mutateAsync()
      await refetchTrip()
    } catch (error) {
      console.error("Route recalculation failed", error)
    }
  }

  const handleCreateStop = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.target as HTMLFormElement
    const formData = new FormData(form)

    const stopData = {
      trip: tripId,
      location: {
        address: formData.get("location") as string,
        coordinates: { lat: 0, lng: 0 }, // These will be geocoded on the backend
      },
      stop_type: formData.get("stop_type") as string,
      order: Number.parseInt(formData.get("order") as string),
      arrival_time: formData.get("arrival_time")
        ? new Date(formData.get("arrival_time") as string).toISOString()
        : null,
      departure_time: formData.get("departure_time")
        ? new Date(formData.get("departure_time") as string).toISOString()
        : null,
    }

    try {
      await createStopMutation.mutateAsync(stopData)
      await refetchStops()
      form.reset()
      setIsAddingStop(false)
    } catch (error) {
      console.error("Stop creation failed", error)
    }
  }

  if (tripLoading || stopsLoading)
    return <div className="flex justify-center items-center h-screen">Loading trip details...</div>
  if (tripError) return <div className="text-red-500">Error loading trip details. Please try again.</div>

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4">
      {/* Main content area */}
      <div className="flex-1">
        {/* Breadcrumbs */}
        <div className="mb-2">
          <a href="/" className="text-blue-500 hover:underline">
            Home
          </a>
          <span> &gt; </span>
          <a href="/trips" className="text-blue-500 hover:underline">
            Trips
          </a>
          <span> &gt; </span>
          <span>Trip Details</span>
        </div>

        <h1 className="text-2xl font-bold mb-4">Trip Details</h1>

        {/* Map */}
        <TripMap trip={trip} stops={stops || []} />

        {/* Trip summary */}
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Trip Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Current Location:</strong> {trip.current_location.address}
              </p>
              <p>
                <strong>Pickup:</strong> {trip.pickup_location.address}
              </p>
              <p>
                <strong>Dropoff:</strong> {trip.dropoff_location.address}
              </p>
            </div>
            <div>
              <p>
                <strong>Cycle Hours:</strong> {trip.current_cycle_hours} hrs
              </p>
              <p>
                <strong>Estimated Distance:</strong>{" "}
                {trip.estimated_distance ? `${Math.round(trip.estimated_distance)} miles` : "Not calculated"}
              </p>
              <p>
                <strong>Estimated Duration:</strong>{" "}
                {trip.estimated_duration ? `${Math.round(trip.estimated_duration)} hours` : "Not calculated"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleRecalculateRoute} disabled={calculateRouteMutation.isPending}>
              {calculateRouteMutation.isPending ? "Calculating..." : "Calculate Route"}
            </Button>
            <Button onClick={() => router.push(`/trips/${tripId}/logs`)}>View Log Sheet</Button>
          </div>
        </div>

        {/* Stops list */}
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Stops</h2>
            <Button onClick={() => setIsAddingStop(!isAddingStop)}>{isAddingStop ? "Cancel" : "Add Stop"}</Button>
          </div>

          {isAddingStop && (
            <form onSubmit={handleCreateStop} className="mb-4 p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="location">
                    Location
                  </label>
                  <input name="location" id="location" className="w-full p-2 border rounded" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="stop_type">
                    Stop Type
                  </label>
                  <select name="stop_type" id="stop_type" className="w-full p-2 border rounded" required>
                    <option value="">Select type</option>
                    <option value="pickup">Pickup</option>
                    <option value="dropoff">Dropoff</option>
                    <option value="fueling">Fueling</option>
                    <option value="rest">Rest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="order">
                    Order
                  </label>
                  <input
                    type="number"
                    name="order"
                    id="order"
                    className="w-full p-2 border rounded"
                    defaultValue={stops ? stops.length + 1 : 1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="arrival_time">
                    Arrival Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="arrival_time"
                    id="arrival_time"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="departure_time">
                    Departure Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="departure_time"
                    id="departure_time"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <Button type="submit" className="mt-4" disabled={createStopMutation.isPending}>
                {createStopMutation.isPending ? "Adding..." : "Add Stop"}
              </Button>
            </form>
          )}

          {stops && stops.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Order</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop: {id: string, stop_type: string, location: {address: string}, order: number, duration: number}) => (
                    <tr key={stop.id} className="border-t">
                      <td className="p-2">{stop.order}</td>
                      <td className="p-2 capitalize">{stop.stop_type}</td>
                      <td className="p-2">{stop.location.address}</td>
                      <td className="p-2">{stop.duration ? `${Math.round(stop.duration / 60)} min` : "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No stops added yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}