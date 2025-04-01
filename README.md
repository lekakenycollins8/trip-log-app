# Trip Planner Documentation

## 1. Introduction

The **Trip Planner** is a full-stack web application designed to help users plan their trips efficiently. It automates stop generation, calculates optimal routes using Mapbox, and ensures compliance with Hours of Service (HOS) regulations.

### Technologies Used
- **Backend**: Django REST Framework (DRF), PostgreSQL, Celery, Gunicorn
- **Frontend**: Next.js, Tailwind CSS, shadcn/ui, Zustand, React Query, Axios
- **Deployment**: Backend on Render, Frontend on Vercel

### Key Features
- Automated stop generation based on HOS regulations
- Route calculation using Mapbox
- Log sheet generation and duty cycle validation
- User-friendly interface for trip management

---

## 2. System Architecture

The application follows a client-server architecture:
- **Frontend**: Next.js communicates with the backend via RESTful APIs.
- **Backend**: Django REST Framework handles business logic, database interactions, and API responses.
- **External Services**: Mapbox for route calculations, Celery for background tasks.

### Data Flow
1. User inputs trip details on the frontend.
2. Frontend sends API requests to the backend.
3. Backend processes the request, interacts with the database, and triggers Celery tasks if needed.
4. API responses are sent back to the frontend for rendering.

## 3. Backend Overview (Django REST Framework)

### Folder Structure
- `models.py`: Defines database models (e.g., Trip, Stop, Route, LogEntry).
- `views.py`: Handles API requests and responses.
- `serializers.py`: Converts data between Python objects and JSON.

### Database Schema
- **Trip**: Stores trip details (start/end locations, status).
- **Stop**: Stores stops generated for a trip.
- **Route**: Stores route details (distance, duration).
- **LogEntry**: Stores HOS compliance logs.

### API Endpoints
Example:
```
POST /api/trips/
Request: { "start_location": "...", "end_location": "..." }
Response: { "trip_id": 1, "status": "Created" }
```

### Business Logic
- **Route Calculation**: Uses Mapbox API to calculate routes.
- **Stop Generation**: Automated based on HOS regulations.
- **Log Validation**: Ensures compliance with duty cycles.

## 4. Frontend Overview (Next.js + Zustand + React Query)

### Folder Structure
- `/components/ui/`: Shared UI components.
- `/app/`: Pages using Next.js dynamic routing.
- `/store/`: Zustand state management.
- `/services/`: API calls using Axios.

### State Management
- **Zustand**: Manages trip state across components.
- **React Query**: Handles API calls and caching.

### Pages & User Flow
- `/trips/[id]`: View trip details.
- `/trips/[id]/logs`: View and manage logs.

---

## 5. API Documentation

### Fetch Trip Details
**GET /api/trips/{id}/**
- **Request**: None
- **Response**:
  ```json
  {
    "trip_id": 1,
    "start_location": "...",
    "end_location": "...",
    "route": { "distance": "500 miles", "duration": "8 hours" }
  }
  ```
- **Possible Errors**:
  - 404 Not Found (if trip ID is invalid)

---

## 6. Deployment Guide

### Backend Deployment (Render)
1. Configure `ALLOWED_HOSTS` in Django settings.
2. Set up PostgreSQL on Render.
3. Use Gunicorn for production.
4. Define environment variables (e.g., database URL, Mapbox API key).

### Frontend Deployment (Vercel)
1. Deploy the Next.js app on Vercel.
2. Set environment variables for the API base URL.
3. Configure CORS in Django to allow frontend requests.

---

## 7. User Flow

### Step-by-Step Guide
1. **Create a Trip**: Enter start and end locations.
2. **View Route**: Visualize the route on Mapbox.
3. **Check Stops**: Review automatically generated stops.
4. **Download Reports**: Export trip logs and details.


---

## 8. Security & Best Practices

- **API Authentication**: Use token-based authentication.
- **Rate Limiting**: Prevent abuse of API endpoints.
- **Secure API Keys**: Store sensitive keys in environment variables.
- **Input Validation**: Sanitize user inputs to prevent SQL injection and XSS.

---

## 9. Inconsistencies & Suggested Improvements

### Potential Code Issues
- Optimize API endpoints to reduce redundant queries.
- Use database indexing for faster lookups.

### State Management
- Ensure React Query and Zustand are used efficiently to avoid unnecessary re-renders.

### Frontend Performance
- Optimize Mapbox rendering for large datasets.

### Scalability
- Consider WebSockets for real-time updates.

### Security Risks
- Validate all user inputs and sanitize outputs.

---

## 10. Future Enhancements & Roadmap

- **Real-Time Vehicle Tracking**: Add live tracking for trips.
- **Trip Sharing**: Allow users to share trips with others.
- **PDF Export**: Enable exporting trips as PDF reports.
- **Scalability**: Implement caching and load balancing for high traffic.

---

## Final Notes

This documentation is designed to be developer-friendly, making it easy for new contributors to onboard. For further details, refer to the codebase and inline comments.
