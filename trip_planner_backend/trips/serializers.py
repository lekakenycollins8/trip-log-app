from rest_framework import serializers
from trips.models import Stop, Trip, LogEntry, Route

class StopSerializer(serializers.ModelSerializer):
    """Serializer for stop model"""
    class Meta:
        model = Stop
        fields = ['id', 'trip', 'location', 'stop_type', 'status', 'order', 'arrival_time', 'departure_time', 'duration']
        #read_only_fields = ['duration']

class LogEntrySerializer(serializers.ModelSerializer):
    """Serializer for log entry model"""
    class Meta:
        model = LogEntry
        fields = ['id', 'trip', 'date', 'status', 'start_time', 'end_time', 'duration', 'remarks']
        read_only_fields = ['duration']

    def validate(self, data):
        """Ensures that the log entries for a day do not exceed 24 hours"""
        trip = data.get('trip')
        log_date = data.get('date')
        exisiting_logs = LogEntry.objects.filter(trip=trip, date=log_date)

        # Compute total time including new entry
        total_duration = sum([log.duration for log in exisiting_logs], data.get('end_time') - data.get('start_time'))

        if total_duration > timedelta(hours=24):
            raise serializers.ValidationError("Total duration for the day cannot exceed 24 hours")

        return data

class TripSerializer(serializers.ModelSerializer):
    """Serializer for trip model with nested stops and logs"""

    stops = StopSerializer(many=True, read_only=True) # Nested stops
    log_entries = LogEntrySerializer(many=True, read_only=True) # Nested log entries

    class Meta:
        model = Trip
        fields = ['id', 'current_location', 'pickup_location', 'dropoff_location', 'current_cycle_hours', 'estimated_distance', 'estimated_duration', 'status', 'created_at', 'updated_at', 'stops', 'log_entries']
        read_only_fields = ['created_at', 'updated_at']

class RouteSerializer(serializers.ModelSerializer):
    """Serializer for route model"""

    class Meta:
        model = Route
        fields = ['id', 'trip', 'route_data', 'created_at']
        read_only_fields = ['created_at']

class GenerateLogsSerializer(serializers.Serializer):
    """Empty serializer for log generation endpoint"""
    pass
