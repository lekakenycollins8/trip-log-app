// src/types/tripTypes.ts

export interface Trip {
    id: string,
    current_location: any,
    pickup_location: any,
    current_cycle_hours: number,
    estimated_distance?: number, // in miles
    estimated_duration?: number, // in hours
    status: 'planned' | 'in_progress' | 'completed',
    created_at: string,
}

export interface Stop {
    id: string,
    tripId: string,
    location: any,
    stop_type: 'pickup' | 'dropoff' | 'rest' | 'fueling',
    order: number,
    arrival_time?: string,
    departure_time?: string,
    duration?: string, // Duration is serialized as a string (e.g., "HH:MM:SS")
    status: 'planned' | 'visited' | 'skipped',
    source: 'generated' | 'manual',
}

export interface LogEntry {
    id: string,
    tripId: string,
    date: string,
    status: 'driving' | 'off-duty' | 'sleeper' | 'on-duty',
    start_time: string,
    end_time: string,
    duration: number,
    remarks?: string,
}

export interface RouteData {
    route_data: any,
    created_at: string,
}