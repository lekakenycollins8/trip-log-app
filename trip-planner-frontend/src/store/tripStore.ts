import { create } from 'zustand';
import { Trip, Stop, LogEntry, RouteData } from '../types/tripTypes';
import { SERVER_PROPS_GET_INIT_PROPS_CONFLICT } from 'next/dist/lib/constants';

export interface TripState {
    trip: Trip | null,
    stops: Stop[],
    logs: LogEntry[],
    routeData: RouteData | null,
    // Actions
    setTrip: (trip: Trip) => void,
    resetTrip: () => void,
    setStops: (stops: Stop[]) => void,
    setLogs: (logs: LogEntry[]) => void,
    setRouteData: (routeData: RouteData) => void,
}

export const userTripStore = create<TripState>((set) => ({
    trip: null,
    stops: [],
    logs: [],
    routeData: null,
    setTrip: (trip: Trip) => set({ trip }),
    resetTrip: () =>
        set(() => ({
            trip: null,
            stops: [],
            logs: [],
            routeData: null,
        })),
    setStops: (stops: Stop[]) => set({ stops }),
    setLogs: (logs: LogEntry[]) => set({ logs }),
    setRouteData: (routeData: RouteData) => set({ routeData }),
}));