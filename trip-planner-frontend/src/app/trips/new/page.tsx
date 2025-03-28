"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreateTrip } from "@/hooks/useTripData"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertCircle, MapPin, TruckIcon, Clock } from "lucide-react"
import { geocodeLocation } from "@/lib/mapbox"

export default function NewTripPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    currentLocation: "",
    pickupLocation: "",
    dropoffLocation: "",
    currentCycleHours: 0,
  })
  const [error, setError] = useState<string | null>(null)

  const createTripMutation = useCreateTrip()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "currentCycleHours" ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      // Validate inputs
      if (formData.currentCycleHours < 0 || formData.currentCycleHours > 70) {
        setError("Cycle hours must be between 0 and 70")
        return
      }

      // Geocode locations
      const [currentCoords, pickupCoords, dropoffCoords] = await Promise.all([
        geocodeLocation(formData.currentLocation),
        geocodeLocation(formData.pickupLocation),
        geocodeLocation(formData.dropoffLocation),
      ])

      // Check if geocoding was successful
      if (!currentCoords.lat || !pickupCoords.lat || !dropoffCoords.lat) {
        setError("Could not geocode one or more locations. Please check your addresses.")
        return
      }

      const payload = {
        current_location: { address: formData.currentLocation, coordinates: currentCoords },
        pickup_location: { address: formData.pickupLocation, coordinates: pickupCoords },
        dropoff_location: { address: formData.dropoffLocation, coordinates: dropoffCoords },
        current_cycle_hours: formData.currentCycleHours,
      }

      const data = await createTripMutation.mutateAsync(payload)

      toast({
        title: "Trip Created",
        description: "Your trip has been successfully created.",
      })

      router.push(`/trips/${data.id}`)
    } catch (error) {
      console.error("Failed to create trip", error)
      setError("Failed to create trip. Please try again.")
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Trip</h1>
        <p className="text-gray-600">Enter trip details to generate a route and ELD logs</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
          <CardDescription>All fields are required to calculate your route and generate compliant logs</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} id="trip-form" className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="currentLocation" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Current Location
                </Label>
                <Input
                  id="currentLocation"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleChange}
                  placeholder="Enter your current location"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pickupLocation" className="flex items-center gap-2">
                  <TruckIcon className="h-4 w-4" />
                  Pickup Location
                </Label>
                <Input
                  id="pickupLocation"
                  name="pickupLocation"
                  value={formData.pickupLocation}
                  onChange={handleChange}
                  placeholder="Enter pickup location"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dropoffLocation" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dropoff Location
                </Label>
                <Input
                  id="dropoffLocation"
                  name="dropoffLocation"
                  value={formData.dropoffLocation}
                  onChange={handleChange}
                  placeholder="Enter dropoff location"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currentCycleHours" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Current Cycle Hours Used
                </Label>
                <Input
                  id="currentCycleHours"
                  name="currentCycleHours"
                  type="number"
                  min="0"
                  max="70"
                  step="0.5"
                  value={formData.currentCycleHours}
                  onChange={handleChange}
                  placeholder="Enter hours used in current cycle (0-70)"
                  required
                />
                <p className="text-xs text-gray-500">
                  Enter the number of hours you've already driven in your current 70-hour/8-day cycle
                </p>
              </div>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>

          <Button type="submit" form="trip-form" disabled={createTripMutation.isPending}>
            {createTripMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Trip...
              </>
            ) : (
              "Create Trip"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}