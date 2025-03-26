from django.db import models
from django.core.exceptions import ValidationError
from django.utils.timezone import now
from datetime import timedelta

def haversine_distance(coord1, coord2):
    """Calculates the distance between two sets of coordinates in miles"""
    # Convert decimal degrees to radians
    lon1, lat1 = map(math.radians, coord1)
    lon2, lat2 = map(math.radians, coord2)

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000 # Radius of Earth in meters
    return c * r 

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
        """Based on distance and regulations, generates fueling and rest stops
        --inserts a 1 hour pickup stop at the pickup location
        --inserts a 1 hour dropoff stop at the dropoff location
        --inserts fueling stops every 1000 miles
        -- inserts a 30 minute rest stop every 8 hours"""
        # Business logic for automatic stop generation

        stops = []
        order = 1 #To order steps sequentially

        # Pickup stop
        stops.append(Stop(
            trip=self,
            location=self.pickup_location,
            stop_type='pickup',
            order=order,
            duration=timedelta(hours=1)
        ))
        order += 1

        # Fueling stops every 1000 miles
        if self.estimated_distance:
            fueling_stop_count = int(self.estimated_distance // 1000)
            # Assume fueling stops are evenly paced along the route
            for i in range(1, fueling_stop_count + 1):
                fueling_location = self.calculate_location_along_route(fraction=i / (fueling_stop_count + 1))
                stops.append(Stop(
                    trip=self,
                    location=fueling_location,
                    stop_type='fueling',
                    order=order,
                    duration=timedelta(minutes=30)
                ))
                order += 1
        
        # Rest stops every 8 hours
        if self.estimated_duration:
            rest_break_count = int(self.estimated_duration // 8)
            for i in range(1, rest_break_count + 1):
                rest_location = self.calculate_location_along_route(fraction=i / (rest_break_count + 1))
                stops.append(Stop(
                    trip=self,
                    location=rest_location,
                    stop_type='rest',
                    order=order,
                    duration=timedelta(minutes=30)
                ))
                order += 1
        
        # Dropoff stop
        stops.append(Stop(
            trip=self,
            location=self.dropoff_location,
            stop_type='dropoff',
            order=order,
            duration=timedelta(hours=1)
        ))
        order += 1

        # Validate stops before saving
        self.validate_stop_schedule(stops)

        with transaction.atomic():
            for stop in stops:
                stop.save()
        return stops
    
    def calculate_location_along_route(self, fraction):
        """interpolates location along the route based on the fraction provided.
        Fraction should be between 0 and 1
        Uses route data geometry stored in self.route.route_data"""
        if not hasattr(self, 'route') or not self.route.route_data:
            raise Exception("Route data not found for trip")
        route_data = self.route.route_data
        # Expecting route_data['geometry']['coordinates'] to be a list of coordinates
        coordinates = route_data.get('geometry', {}).get('coordinates')
        if not coordinates:
            raise Exception("Route coordinates not found in route data")
        
        # Calculate total distance of route
        total_length = 0
        distances = []
        for i in range(1, len(coordinates)):
            d = haversine_distance(coordinates[i-1], coordinates[i])
            distances.append(d)
            total_length += d
        
        target_distance = fraction * total_length
        cumulative = 0
        for i, segment_length in enumerate(distances):
            if cumulative + segment_length >= target_distance:
                # Interpolate between coordinates[i] and coordinates[i+1]
                remainder = target_distance - cumulative
                t = remainder / segment_length
                lng1, lat1 = coordinates[i]
                lng2, lat2 = coordinates[i+1]
                interp_lng = lng1 + t * (lng2 - lng1)
                interp_lat = lat1 + t * (lat2 - lat1)
                return {
                    "address": f"Interpolated location at {fraction*100:0f}%",
                    "coordinates": {"lat": interp_lat, "lng": interp_lng}
                }
            cumulative += segment_length
        # Fallback return last coordinate incase target_distance is not exactly hit
        lng, lat = coordinates[-1]
        return {
            "address": f"Interpolated location at {fraction*100:0f}%",
            "coordinates": {"lat": lat, "lng": lng}
        }



    def validate_stop_schedule(self, stops):
        """validates stops according to HOS regulations"""
        return True # Placeholder for actual validation logic

    def generate_log_entries_detailed(self):
        """Generate daily log entries for the trip
        - Maximum of 11 hours driving per day
        - Mandatory 10 hours off-duty if driving continues next day
        The algorithm:
            - Uses trip.start_time or creation time as dynamic start
            - Divides total driving time (estimated_duration minus total stops time) equally among driving segements.
            - For each stop, creates a log entry with duty status:
                -pickup, dropoff, fueling, stops -> status on duty
                - rest stops -> status sleeper if duration >= 7 hours, else off_duty
            -Inserts driving segements between stops with status driving
            --Fills any remainin day with on_duty status
        """

        logs = []
        stops = list(self.stops.order_by('order'))
        if not stops:
            return self.generate_log_entries()
        
        # Calculate total stops duration in hours
        total_stops_seconds = sum([stop.duration.total_seconds() for stop in stops], 0)
        total_stops_hours = total_stops_seconds / 3600
        if not self.estimated_duration:
            raise Exception("Estimated duration not found for trip")
        total_driving_hours = self.estimated_duration - total_stops_hours
        if total_driving_hours < 0:
            total_driving_hours = 0
        num_driving_segments = len(stops) + 1
        driving_segement_duration = total_driving_hours / num_driving_segments

        # Start time for first log entry
        current_time = self.created_at

        driving_start = current_time
        driving_end = driving_start + timedelta(hours=driving_segement_duration)
        driving_log = LogEntry(
            trip=self,
            date=driving_start.date(),
            status='driving',
            start_time=driving_start.time(),
            end_time=driving_end.time(),
            remarks="Driving segment"
        )
        driving_log.save()
        logs.append(driving_log)
        current_time = driving_end

        # Iterate over stops and driving segments
        for stop in stops:
            stop_start = current_time
            stop_end = stop_start + stop.duration
            if stop.stop_type == 'rest' and stop.duration >= timedelta(hours=7):
                status = 'sleeper'
            else:
                status = 'on_duty'
            stop_log = LogEntry(
                trip=self,
                date=stop_start.date(),
                status=status,
                start_time=stop_start.time(),
                end_time=stop_end.time(),
                remarks=f"{stop.get_stop_type_display()} stop"
            )
            stop_log.save()
            logs.append(stop_log)
            current_time = stop_end

            # Insert driving segment after stop
            driving_start = current_time
            driving_end = driving_start + timedelta(hours=driving_segement_duration)
            driving_log = LogEntry(
                trip=self,
                date=driving_start.date(),
                status='driving',
                start_time=driving_start.time(),
                end_time=driving_end.time(),
                remarks="Driving segment"
            )
            driving_log.save()
            logs.append(driving_log)
            current_time = driving_end
        # if theres remaining time in the day, fill with on_duty status
        while current_time.date() == driving_start.date():
            on_duty_log = LogEntry(
                trip=self,
                date=current_time.date(),
                status='on_duty',
                start_time=current_time.time(),
                end_time=(current_time + timedelta(hours=1)).time(),
                remarks="Remaining time in the day"
            )
            on_duty_log.save()
            logs.append(on_duty_log)
            current_time += timedelta(hours=1)
        return logs
    
    def generate_log_entries(self):
        """generates simpler log generation without stops"""
        logs = []
        if not self.estimated_duration:
            raise Exception("Estimated duration not found for trip")
        total_hours = self.estimated_duration
        day_count = int(total_hours // 24) + (1 if total_hours % 24 else 0)
        trip_start = datetime.combine(self.created_at.date(), time(8, 0))
        current_day_start = trip_start
        remaining_hours = total_hours
        for day in range(daycount):
            day_logs = []
            driving_hours = min(11, remaining_hours) if remaining_hours > 11 else remaining_hours
            driving_start = current_day_start
            driving_end = driving_start + timedelta(hours=driving_hours)
            d_log = LogEntry(
                trip=self,
                date=current_day_start.date(),
                status='driving',
                start_time=driving_start.time(),
                end_time=driving_end.time(),
                remarks="Driving segment"
            )
            d_log.save()
            day_logs.append(d_log)
            if day < day_count - 1:
                off_start = driving_end
                off_end = off_start + timedelta(hours=10)
                off_log = LogEntry(
                    trip=self,
                    date=off_start.date(),
                    status='off_duty',
                    start_time=off_start.time(),
                    end_time=off_end.time(),
                    remarks="Mandatory off-duty"
                )
                off_log.save()
                day_logs.append(off_log)
                on_hours = 24 - driving_hours - 10
                on_start = off_end
                on_end = on_start + timedelta(hours=on_hours)
                on_log = LogEntry(
                    trip=self,
                    date=current_day_start.date(),
                    status='on_duty',
                    start_time=on_start.time(),
                    end_time=on_end.time(),
                    remarks="On-duty"
                )
                on_log.save()
                day_logs.append(on_log)
            else:
                assigned = driving_hours
                on_hours = 24 - assigned
                on_start = driving_end
                on_end = on_start + timedelta(hours=on_hours)
                on_log = LogEntry(
                    trip=self,
                    date=current_day_start.time(),
                    status='on_duty',
                    start_time=on_start.time(),
                    end_time=on_end.time(),
                    remarks="On duty period (last day)"
                )
                on_log.save()
                day_logs.append(on_log)
            logs.extend(day_logs)
            remaining_hours -= 24
            current_day_start += timedelta(days=1)
        return logs

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


