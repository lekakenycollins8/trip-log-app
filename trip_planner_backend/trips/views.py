from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from trips.models import Trip, Stop, LogEntry, Route
from trips.serializers import TripSerializer, StopSerializer, LogEntrySerializer, RouteSerializer, GenerateLogsSerializer
from trips.services.mapbox_service import MapboxService, get_coordinates
from datetime import timedelta


class TripViewSet(viewsets.ModelViewSet):
    """API endpoint that allows trips to be viewed, created, updated, or deleted"""
    queryset = Trip.objects.all().order_by('-created_at')
    serializer_class = TripSerializer

    def create(self, request, *args, **kwargs):
        """Overrides default create to validate location data"""
        return self._validate_and_create_or_update(request, is_update=False)

    def update(self, request, *args, **kwargs):
        """Overrides default update to validate location data"""
        return self._validate_and_create_or_update(request, is_update=True)

    def _validate_and_create_or_update(self, request, is_update=False):
        """Validates location data and creates or updates the trip"""
        location_fields = ['current_location', 'pickup_location', 'dropoff_location']
        for field in location_fields:
            location_data = request.data.get(field)
            if location_data and not isinstance(location_data, dict):
                return Response(
                    {"error": f"Invalid format for {field}. Expected a JSON object."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if location_data:
                coordinates = location_data.get('coordinates')
                if not location_data.get('address') or not isinstance(coordinates, dict) or 'lat' not in coordinates or 'lng' not in coordinates:
                    return Response(
                        {"error": f"Invalid {field} format. Expected {{\"address\": \"...\", \"coordinates\": {{\"lat\": ..., \"lng\": ...}}}}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if is_update:
            self.perform_update(serializer)
        else:
            self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], url_path='calculate-route')
    def calculate_route(self, request, pk=None):
        """Calls mapbox API to calculate route details
        This should update the Trip instance with estimated distance and duration"""
        trip = self.get_object()

        # Validate required fields
        required_fields = ['current_location', 'dropoff_location']
        for field in required_fields:
            if not getattr(trip, field):
                print(f"ERROR: Missing required field {field} for trip {trip.id}")
                return Response(
                    {"error": f"Missing required location: {field}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            # Extract coordinates from location JSON
            try:
                origin = get_coordinates(trip.current_location)
                destination = get_coordinates(trip.dropoff_location)
                waypoints = [get_coordinates(trip.pickup_location)] if trip.pickup_location else None
            except Exception as e:
                print(f"ERROR: Failed to extract coordinates for trip {trip.id}: {str(e)}")
                print(f"Current location data: {trip.current_location}")
                print(f"Dropoff location data: {trip.dropoff_location}")
                print(f"Pickup location data: {trip.pickup_location}")
                raise

            print(f"INFO: Processing route for trip {trip.id}")
            print(f"Origin coordinates: {origin}")
            print(f"Destination coordinates: {destination}")
            print(f"Waypoint coordinates: {waypoints}")
            
            try:
                route_data = MapboxService.get_route(origin, destination, waypoints=waypoints)
            except Exception as e:
                print(f"ERROR: Mapbox API call failed for trip {trip.id}: {str(e)}")
                return Response({
                    "error": f"Route calculation failed: {str(e)}",
                    "origin": origin,
                    "destination": destination,
                    "waypoints": waypoints
                }, status=status.HTTP_400_BAD_REQUEST)

            # Update trip with route details
            try:
                trip.estimated_distance = route_data.get('distance', 0) / 1609.34
                trip.estimated_duration = route_data.get('duration', 0) / 3600
                trip.save()
            except Exception as e:
                print(f"ERROR: Failed to update trip {trip.id} with route details: {str(e)}")
                raise

            # Save route data
            try:
                Route.objects.update_or_create(
                    trip=trip,
                    defaults={"route_data": route_data}
                )
                trip.generate_stops()
            except Exception as e:
                print(f"ERROR: Failed to save route data for trip {trip.id}: {str(e)}")
                raise

            print(f"SUCCESS: Route calculated for trip {trip.id}")
            return Response({
                "message": "Route calculated successfully",
                "route_data": route_data,
                "trip": TripSerializer(trip).data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"ERROR: Unexpected error for trip {trip.id}: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='validate')
    def validate_trip(self, request, pk=None):
        """validates the trip based on FMCSA HOS rules
        Returns warnings if any duty cycles are violated
        Checks:
            -Daily driving does not exceed 11 hours
            -Trip does not violate the 70-hour/8-day cycle
        Endpoint: GET /api/trips/{trip_id}/validate/
        """
        trip = self.get_object()
        warnings = []

        # Validate daily driving using log entries
        # Assuming log entries have been generated 
        log_dates = trip.log_entries.values_list('date', flat=True).distinct()
        for log_date in log_dates:
            totals = LogEntry.compute_daily_totals(trip, log_date)
            driving_duration = totals.get('status_durations', {}).get('driving', timedelta(0))
            if driving_duration > timedelta(hours=11):
                warnings.append(
                    f"On {log_date}, daily driving duration exceeds 11 hours: {driving_duration}"
                )
        # Validate 70 hour/8-day cycle
        # We use the trip's current_cycle_hours to track the total hours in the current cycle
        if trip.current_cycle_hours > 70:
            warnings.append(
                f"Total hours in the current cycle exceed 70 hours: {trip.current_cycle_hours}"
            )
        is_valid = len(warnings) == 0

        return Response({
            "is_valid": is_valid,
            "warnings": warnings
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], serializer_class=GenerateLogsSerializer, url_path='generate-logs')
    def generate_logs(self, request, pk=None):
        """Generates log entries for the trip based on stops and route data
        Endpoint: POST /api/trips/{trip_id}/generate-logs/
        """
        try:
            trip = self.get_object()
            
            # Check if trip exists
            if not trip:
                return Response(
                    {"error": "Trip not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check if route data exists
            if not hasattr(trip, 'route') or not trip.route:
                return Response(
                    {"error": "Route data not found. Please calculate route first."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            print(f"INFO: Generating logs for trip {trip.id}")
            
            try:
                # Try detailed log generation first
                logs = trip.generate_log_entries_detailed()
                print(f"INFO: Generated detailed logs for trip {trip.id}")
            except Exception as e:
                print(f"WARNING: Detailed log generation failed for trip {trip.id}: {str(e)}")
                # Fallback to simpler log generation
                try:
                    logs = trip.generate_log_entries()
                    print(f"INFO: Generated simple logs for trip {trip.id}")
                except Exception as inner_e:
                    print(f"ERROR: Simple log generation failed for trip {trip.id}: {str(inner_e)}")
                    return Response(
                        {"error": f"Log generation failed: {str(inner_e)}"}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            if not logs:
                return Response(
                    {"error": "No logs were generated"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            serialized_logs = LogEntrySerializer(logs, many=True).data
            print(f"SUCCESS: Generated {len(logs)} logs for trip {trip.id}")
            
            return Response({
                "message": "Logs generated successfully",
                "logs": serialized_logs
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERROR: Unexpected error in generate_logs for trip {pk}: {str(e)}")
            return Response(
                {"error": "An unexpected error occurred while generating logs"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class StopViewSet(viewsets.ModelViewSet):
    """API endpoint for managing stops within a trip"""
    queryset = Stop.objects.all().order_by('order')
    serializer_class = StopSerializer

    def get_queryset(self):
        """Filters stops based on trip id"""
        trip_id = self.request.query_params.get('trip')
        if trip_id:
            return self.queryset.filter(trip__id=trip_id)
        return self.queryset

class LogEntryViewSet(viewsets.ModelViewSet):
    """API endpoint for managing log entries (ELD logs) within a trip"""
    queryset = LogEntry.objects.all().order_by('date')
    serializer_class = LogEntrySerializer

    def get_queryset(self):
        """Filters log entries based on trip id"""
        trip_id = self.request.query_params.get('trip')
        if trip_id:
            return self.queryset.filter(trip__id=trip_id)
        return self.queryset

class RouteViewSet(viewsets.ModelViewSet):
    """Accessing stored route data"""
    queryset = Route.objects.all().order_by('-created_at')
    serializer_class = RouteSerializer

    def get_queryset(self):
        """Filters routes based on trip id"""
        trip_id = self.request.query_params.get('trip')
        if trip_id:
            return self.queryset.filter(trip__id=trip_id)
        return self.queryset