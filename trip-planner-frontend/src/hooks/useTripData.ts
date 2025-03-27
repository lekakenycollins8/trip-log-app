// src/hooks/useTripData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrip, createTrip, updateTrip, deleteTrip, getStops, createStop, getLogs, generateLogs, calculateRoute, validateHOS } from '../services/api';

/**
 * Custom hook to encapsulate the logic for accessing and updating trip data.
 * Returns state and actions defined in the trip store.
 */

// Hook to fetch trip details
export const useTrip = (tripId: string) => {
    return useQuery({
        queryKey: ['trip', tripId],
        queryFn: () => getTrip(tripId),
        enabled: !!tripId,
        retry: 2
    });
};

// hook to create new trip
export const useCreateTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createTrip(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trip'] });
        },
    });
};

// hook to update trip
export const useUpdateTrip = (tripId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => updateTrip(tripId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trip', tripId], exact: true });
        },
    });
};

// hook to delete trip
export const useDeleteTrip = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tripId: string) => deleteTrip(tripId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trip'] });
        },
    });
};

// hook to fetch stops
export const useStops = (tripId: string) => {
    return useQuery({
        queryKey: ['stops', tripId],
        queryFn: () => getStops(tripId),
        enabled: !!tripId,
        retry: 2
    });
};

//hook to fetch logs
export const useLogs = (tripId: string) => {
    return useQuery({
        queryKey: ['logs', tripId],
        queryFn: () => getLogs(tripId),
        enabled: !!tripId,
        retry: 2
    });
};

// hook to calculate route for a trip
export const useCalculateRoute = (tripId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => calculateRoute(tripId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trip', tripId], exact: true });
        },
    });
};

// hook to generate logs for a trip
export const useGenerateLogs = (tripId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => generateLogs(tripId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['logs', tripId], exact: true });
        },
    });
};

// hook to validate HOS for a trip
export const useValidateHOS = (tripId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => validateHOS(tripId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['logs', tripId], exact: true });
        },
    });
};

