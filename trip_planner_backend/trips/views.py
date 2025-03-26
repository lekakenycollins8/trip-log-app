from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from trips.models import Trip, Stop, LogEntry, Route
from trips.serializers import TripSerializer, StopSerializer, LogEntrySerializer, RouteSerializer
from trips.services.mapbox_service import MapboxService, get_coordinates


class TripViewSet(viewsets.ModelViewSet):
    """API endpoint that allows trips to be viewed, created, updated, or deleted"""
    queryset = Trip.objects.all().order_by('-created_at')
    serializer_class = TripSerializer

    @action(detail=True, methods=['post'], url_path='calculate-route')
    def calculate_route(self, request, pk=None):
        """Calls mapbox API to calculate route details
        This should update the Trip instance with estimated distance and duration"""
        trip = self.get_object()

        try:
            # Extract coordinates from location JSON
            origin = get_coordinates(trip.current_location)
            destination = get_coordinates(trip.dropoff_location)
            # Optionally use pickup location as waypoint
            waypoints = [get_coordinates(trip.pickup_location)] if trip.pickup_location else None

            # Fetch route data from Mapbox API
            route_data = MapboxService.get_route(origin, destination, waypoints=waypoints)

            # update trip with route details (convert meters to miles and seconds to hours)
            trip.estimated_distance = route_data.get('distance', 0) / 1609.34
            trip.estimated_duration = route_data.get('duration', 0) / 3600
            trip.save()

            # Save route data in Route model
            Route.objects.update_or_create(
                trip=trip,
                defaults={"route_data": route_data}
            )

            return Response({
                "message": "Route calculated successfully",
                "route_data": route_data,
                "trip": TripSerializer(trip).data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='validate')
    def validate_trip(self, request, pk=None):
        """validates the trip based on FMCSA HOS rules
        Returns warnings if any duty cycles are violated"""
        trip = self.get_object()
        # Placeholder: implement actual validation logic
        validation_result = {
            "is_valid": True,
            "warnings": []
        }
        # For example, if trip.current_cycle_hours > 70 then flag warning
        if trip.current_cycle_hours > 70:
            validation_result['is_valid'] = False
            validation_result['warnings'].append("Current cycle hours exceed 70 hours")
        
        return Response(validation_result, status=status.HTTP_200_OK)

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