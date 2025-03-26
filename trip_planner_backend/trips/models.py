from django.db import models
from django.core.exceptions import ValidationError
from django.utils.timezone import now
from datetime import timedelta


# Trip Model
class Trip(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    current_location = models.JSONField() #{"address": "...", "coordinates": {"lat": ..., "lng": ...}}
    pickup_location = models.JSONField()
    dropoff_location = models.JSONField()
    current_cycle_hours = models.FloatField(default=0) # Hours driven in current cycle
    estimated_distance = models.FloatField(null=True, blank=True) # Distance in miles
    estimated_duration = models.FloatField(null=True, blank=True) # Duration in hours
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Trip from {self.pickup_location['address']} to {self.dropoff_location['address']}"

    def claculate_route(self):
        """Calls Mapbox API to get route details and saves estimated distance and duration"""
        # This function will be implemented in the service layer calling mapbox directions API

    def generate_stops(self):
        """Based on distance and regulations, generates fueling and rest stops"""
        # Business logic for automatic stop generation

    def validate_duty_cycle(self):
        """Ensures the trip follows FMCSA HOS rules before confirming it"""
        # Business logic for validating duty cycle

# Stop Model
class Stop(models.Model):
    STOP_TYPES = [
        ('pickup', 'Pickup'),
        ('dropoff', 'Dropoff'),
        ('fueling', 'Fueling'),
        ('rest', 'Rest'),
    ]

    trip = models.ForeignKey(Trip, related_name="stops", on_delete=models.CASCADE)
    location = models.JSONField()
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    order = models.PositiveIntegerField() # Determins sequence of stops
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True, blank=True) # Duration of stop in hours

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.get_stop_type_display()} stop at {self.location['address']}"

# LogEntry Model

class LogEntry(models.Model):
    STATUS_CHOICES = [
        ('driving', 'Driving'),
        ('off_duty', 'Off Duty'),
        ('sleeper', 'Sleeper Berth'),
        ('on_duty', 'On Duty (Not Driving)'),
    ]

    trip = models.ForeignKey(Trip, related_name="log_entries", on_delete=models.CASCADE)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration = models.DurationField(editable=False) # Auto-computed based on start and end time
    remarks = models.TextField(null=True, blank=True)

    def clean(self):
        """Validates that start_time is before end_time"""
        if self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")
    
    def save(self, *args, **kwargs):
        """Computes duration before saving"""
        start = timedelta(hours=self.start_time.hour, minutes=self.start_time.minute)
        end = timedelta(hours=self.end_time.hour, minutes=self.end_time.minute)
        self.duration = end - start
        super().save(*args, **kwargs)
    
    @classmethod
    def compute_daily_totals(cls, trip, log_date):
        """Computes total time spent on each status choice for the day"""
        logs = cls.objects.filter(trip=trip, date=log_date)
        status_durations = {
            'driving': timedelta(),
            'off_duty': timedelta(),
            'sleeper': timedelta(),
            'on_duty': timedelta(),
        }

        for log in logs:
            status_durations[log.status] += log.duration

        total_day_duration = sum(status_durations.values(), timedelta())
        total_work_duration = status_durations['driving'] + status_durations['on_duty']

        return {
            'status_durations': status_durations,
            'total_day_duration': total_day_duration,
            'total_work_duration': total_work_duration,
        }
    def __str__(self):
        return f"Log Entry on {self.date}: {self.get_status_display()} ({self.duration})"

# Route Model
class Route(models.Model):
    trip = models.OneToOneField(Trip, related_name="route", on_delete=models.CASCADE)
    route_data = models.JSONField() # Stores Mapbox API response
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Route for {self.trip}"


