import { userTripStore, TripState } from "@/store/tripStore";

/**
 * Custom hook to encapsulate the logic for accessing and updating trip data.
 * Returns state and actions defined in the trip store.
 */

export const useTripData = (): TripState => {
    const tripStore = userTripStore((state) => state);
    return tripStore;
}