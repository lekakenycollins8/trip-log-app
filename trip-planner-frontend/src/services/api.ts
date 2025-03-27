// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Trip Endpoints
export const getTrip = async (tripId: string) => {
    const response = await api.get(`/trips/${tripId}`);
    return response.data;
};

export const createTrip = async (tripData: any) => {
    const response = await api.post('/trips', tripData);
    return response.data;
};

export const updateTrip = async (tripId: string, tripData: any) => {
    const response = await api.put(`/trips/${tripId}`, tripData);
    return response.data;
};

export const deleteTrip = async (tripId: string) => {
    const response = await api.delete(`/trips/${tripId}`);
    return response.data;
};

// Stop Endpoints
export const getStops = async (tripId: string) => {
    const response = await api.get(`/stops/?tripId=${tripId}`);
    return response.data;
}

export const createStop = async (stopData: any) => {
    const response = await api.post('/stops', stopData);
    return response.data;
}

// Log Entry Endpoints
export const getLogs = async (tripId: string) => {
    const response = await api.get(`/log-entries/?tripId=${tripId}`);
    return response.data;
}

export const generateLogs = async (tripId: string) => {
    const response = await api.post(`/trips/${tripId}/generate-logs/`);
    return response.data;
}

// Route Calculation
export const calculateRoute = async (tripId: string) => {
    const response = await api.post(`/trips/${tripId}/calculate-route/`);
    return response.data;
}

// HOS Validation
export const validateHOS = async (tripId: string) => {
    const response = await api.post(`/trips/${tripId}/validate/`);
    return response.data;
}