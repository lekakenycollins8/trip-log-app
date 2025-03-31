'use client';

import React from 'react';
import Link from 'next/link';
import { useTripsList } from '@/hooks/useTripData';
import { Trip } from '@/types/tripTypes'; // Assuming types are aliased in tsconfig

const TripsPage = () => {
  const { data: trips, isLoading, error } = useTripsList();

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading trips...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error loading trips: {error.message}</div>;
  }

  // Ensure trips is an array before mapping
  const tripList = Array.isArray(trips) ? trips : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Trips</h1>
      {tripList.length === 0 ? (
        <p>No trips found.</p>
      ) : (
        <ul className="space-y-2">
          {tripList.map((trip: Trip) => (
            <li key={trip.id} className="border p-3 rounded hover:bg-gray-100">
              <Link href={`/trips/${trip.id}`} className="block">
                <p className="font-semibold">Trip ID: {trip.id}</p>
                <p>Status: <span className={`capitalize px-2 py-1 rounded text-xs ${
                  trip.status === 'completed' ? 'bg-green-200 text-green-800' :
                  trip.status === 'in_progress' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-blue-200 text-blue-800' // planned
                }`}>{trip.status}</span></p>
                <p className="text-sm text-gray-600">Created: {new Date(trip.created_at).toLocaleString()}</p>
                {/* Optionally display location info if needed, e.g., trip.pickup_location?.name */}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {/* TODO: Add button/link to create a new trip */}
    </div>
  );
};

export default TripsPage;