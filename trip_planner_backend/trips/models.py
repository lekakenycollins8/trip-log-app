from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils.timezone import now
from datetime import timedelta, datetime, time
import math
from trips.services.mapbox_service import get_address_from_coordinates

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

    def generate_stops(self):
        """Based on distance and regulations, generates fueling and rest stops
        --inserts a 1 hour pickup stop at the pickup location
        --inserts a 1 hour dropoff stop at the dropoff location
        --inserts fueling stops every 1000 miles
        -- inserts a 30 minute rest stop every 8 hours"""
        # Business logic for automatic stop generation

        
        # Delete existing generated stops
        Stop.objects.filter(trip=self, source='generated').delete()

        stops = []
        order = 1 #To order steps sequentially

        # Pickup stop
        stops.append(Stop(
            trip=self,
            location=self.pickup_location,
            stop_type='pickup',
            order=order,
            duration=timedelta(hours=1),
            source='generated'
        ))
        order += 1

        # Fueling stops every 1000 miles
        if self.estimated_distance:
            miles_driven = 0
            cumulative_miles = 0
            for i in range(1, int(self.estimated_distance // 1000) + 1):
                miles_needed = i * 1000
                fraction = miles_needed / self.estimated_distance
                fueling_location = self.calculate_location_along_route(fraction)
                stops.append(Stop(
                    trip=self,
                    location=fueling_location,
                    stop_type='fueling',
                    order=order,
                    source='generated'
                ))
                order += 1
        
        # Rest stops every 8 hours
        if self.estimated_duration:
            hours_driven = 0
            cumulative_hours = 0
            for i in range(1, int(self.estimated_duration // 8) + 1):
                hours_needed = i * 8
                fraction = hours_needed / self.estimated_duration
                rest_location = self.calculate_location_along_route(fraction)
                stops.append(Stop(
                    trip=self,
                    location=rest_location,
                    stop_type='rest',
                    order=order,
                    source='generated'
                ))
                order += 1
        
        # Dropoff stop
        stops.append(Stop(
            trip=self,
            location=self.dropoff_location,
            stop_type='dropoff',
            order=order,
            duration=timedelta(hours=1),
            source='generated'
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
                address = get_address_from_coordinates({"lat": interp_lat, "lng": interp_lng})
                return {
                    "address": address,
                    "coordinates": {"lat": interp_lat, "lng": interp_lng}
                }
            cumulative += segment_length
        # Fallback return last coordinate incase target_distance is not exactly hit
        lng, lat = coordinates[-1]
        address = get_address_from_coordinates({"lat": lat, "lng": lng})
        return {
            "address": address,
            "coordinates": {"lat": lat, "lng": lng}
        }


    def validate_stop_schedule(self, stops):
        """validates stops according to HOS regulations"""
        return True # Placeholder for actual validation logic

    def estimate_driving_time(self, location1, location2):
        """Estimates driving time in hours between two locations using haversine distance."""
        coord1 = location1['coordinates']['lng'], location1['coordinates']['lat']
        coord2 = location2['coordinates']['lng'], location2['coordinates']['lat']
        distance_meters = haversine_distance(coord1, coord2)
        # Estimate driving time based on an average speed of 60 mph (96.56 km/h)
        driving_time_hours = distance_meters / 96560
        return driving_time_hours

    def generate_log_entries_detailed(self):
        """Generate daily log entries for the trip with HOS compliance including sleeper berth provision"""
        logs = []
        stops = list(self.stops.order_by('order'))
        current_time = self.created_at
        
        # Track driving and duty hours for HOS compliance
        current_driving_hours = 0  # Running count of driving hours (resets after 10hr break)
        current_duty_window_start = current_time  # Start of the 14-hour window
        driving_since_break = 0  # Hours driven since last 30-min break
        
        # Weekly hour tracking
        weekly_duty_hours = 0  # For 60/70 hour limit
        weekly_tracking_days = []  # Track last 7/8 days of duty hours
        
        # Initialize sleeper berth tracker
        sleeper_tracker = SleeperBerthTracker()
        
        for stop in stops:
            # Calculate driving time to the next stop
            if stop.order > 1:  # Not the first stop
                prev_stop = stops[stop.order - 2]  # Adjust for 0-indexing
                # Calculate driving time based on locations
                driving_time = self.estimate_driving_time(prev_stop.location, stop.location)
                
                # Check if driver needs a 30-minute break
                if driving_since_break + driving_time > 8:
                    # Insert a 30-minute break before continuing to drive
                    break_start_time = current_time
                    break_end_time = break_start_time + timedelta(minutes=30)
                    break_log = LogEntry(
                        trip=self,
                        date=break_start_time.date(),
                        status='off_duty',  # Could also be 'on_duty' or 'sleeper'
                        start_time=break_start_time.time(),
                        end_time=break_end_time.time(),
                        remarks="Required 30-minute break after 8 hours driving"
                    )
                    break_log.save()
                    logs.append(break_log)
                    current_time = break_end_time
                    driving_since_break = 0
                
                # Calculate hours in current duty window
                hours_in_duty_window = (current_time - current_duty_window_start).total_seconds() / 3600
                
                # Check if we need a rest based on hours limits or if we need to use sleeper berth provision
                if sleeper_tracker.does_driver_need_reset(current_time, current_driving_hours, hours_in_duty_window):
                    # Driver needs either a 10-hour break or to use sleeper berth provision
                    
                    # Determine if we can use an existing sleeper berth calculation period
                    calc_period = sleeper_tracker.get_latest_calculation_period()
                    
                    if calc_period:
                        # We can use sleeper berth provision - reset according to rules
                        # After completing a valid sleeper berth pairing, recalculate available hours
                        current_driving_hours = 0
                        current_duty_window_start = current_time
                        driving_since_break = 0
                        
                        # Note: In a real implementation, you would consider the paired periods
                        # and recalculate more precisely as shown in the documentation
                        remarks = "Hours reset using sleeper berth provision"
                    else:
                        # Need a full 10-hour break
                        rest_start_time = current_time
                        rest_end_time = rest_start_time + timedelta(hours=10)
                        rest_log = LogEntry(
                            trip=self,
                            date=rest_start_time.date(),
                            status='off_duty',  # Could also use sleeper berth
                            start_time=rest_start_time.time(),
                            end_time=rest_end_time.time(),
                            remarks="Required 10-hour break (11-hour driving or 14-hour window limit reached)"
                        )
                        rest_log.save()
                        logs.append(rest_log)
                        
                        # Reset counters after 10-hour break
                        current_time = rest_end_time
                        current_driving_hours = 0
                        current_duty_window_start = current_time
                        driving_since_break = 0
                
                # Now create the driving segment
                driving_end_time = current_time + timedelta(hours=driving_time)
                driving_log = LogEntry(
                    trip=self,
                    date=current_time.date(),
                    status='driving',
                    start_time=current_time.time(),
                    end_time=driving_end_time.time(),
                    remarks=f"Driving to {stop.get_stop_type_display()} stop"
                )
                driving_log.save()
                logs.append(driving_log)
                
                # Update counters
                current_time = driving_end_time
                current_driving_hours += driving_time
                driving_since_break += driving_time
                weekly_duty_hours += driving_time
            
            # Handle the stop itself
            stop_start_time = current_time
            stop_duration = stop.duration or timedelta(minutes=30)  # Default to 30 minutes
            stop_end_time = stop_start_time + stop_duration
            
            # Determine status based on stop type
            status = 'on_duty'  # Default for pickup/dropoff/fueling
            if stop.stop_type == 'rest':
                # Check if this could be a sleeper berth qualifying period
                if stop_duration >= timedelta(hours=7):
                    status = 'sleeper'
                    # Track this as a potential sleeper berth qualifying period
                    sleeper_tracker.add_qualifying_rest(stop_start_time, stop_end_time, 'sleeper')
                elif stop_duration >= timedelta(hours=2):
                    status = 'off_duty'
                    # Track this as a potential qualifying rest period
                    sleeper_tracker.add_qualifying_rest(stop_start_time, stop_end_time, 'off_duty')
                else:
                    status = 'off_duty'
            
            stop_log = LogEntry(
                trip=self,
                date=stop_start_time.date(),
                status=status,
                start_time=stop_start_time.time(),
                end_time=stop_end_time.time(),
                remarks=f"{stop.get_stop_type_display()} stop"
            )
            stop_log.save()
            logs.append(stop_log)
            
            # Update current time
            current_time = stop_end_time
            
            # On-duty time at stops counts against 14-hour window but not driving time
            if status == 'on_duty':
                weekly_duty_hours += stop_duration.total_seconds() / 3600
            
            # Reset counters if this was a 10+ hour break
            if status in ['off_duty', 'sleeper'] and stop_duration >= timedelta(hours=10):
                current_driving_hours = 0
                current_duty_window_start = current_time
                driving_since_break = 0
        
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
        for day in range(day_count):
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

    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('visited', 'Visited'),
        ('skipped', 'Skipped'),
    ]

    trip = models.ForeignKey(Trip, related_name="stops", on_delete=models.CASCADE)
    location = models.JSONField()
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    order = models.PositiveIntegerField() # Determins sequence of stops
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True, blank=True)
    source = models.CharField(max_length=10, choices=[('generated', 'Generated'), ('manual', 'Manual')], default='manual')

    def save(self, *args, **kwargs):
        if self.arrival_time and self.departure_time:
            self.duration = self.departure_time - self.arrival_time
        elif not self.duration and self.stop_type in ['fueling', 'rest']:
            self.duration = timedelta(minutes=30)
        super().save(*args, **kwargs)

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
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration = models.DurationField(editable=False) # Auto-computed based on start and end time
    remarks = models.TextField(null=True, blank=True)

    def clean(self):
        """Validates that start_time is before end_time"""
        if self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")
    
    def save(self, *args, **kwargs):
        start_dt = datetime.combine(self.date, self.start_time)
        end_dt = datetime.combine(self.date, self.end_time)
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        self.duration = end_dt - start_dt
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


# Utility class to track sleeper berth
class SleeperBerthTracker:
    """
    Tracks sleeper berth periods and performs calculations for HOS compliance
    based on the sleeper berth provision in § 395.1(g)
    """
    def __init__(self):
        self.qualifying_rest_periods = []
        self.calculation_periods = []
        
    def add_qualifying_rest(self, start_time, end_time, rest_type):
        """
        Adds a qualifying rest period to the tracker
        
        Parameters:
        start_time (datetime): Start time of the rest period
        end_time (datetime): End time of the rest period
        rest_type (str): Type of rest ('sleeper' or 'off_duty')
        """
        duration = (end_time - start_time).total_seconds() / 3600  # Duration in hours
        
        # Check if this is a qualifying rest period
        if rest_type == 'sleeper' and duration >= 7:
            self.qualifying_rest_periods.append({
                'start': start_time,
                'end': end_time,
                'duration': duration,
                'type': 'sleeper_7_plus'
            })
        elif (rest_type == 'sleeper' or rest_type == 'off_duty') and duration >= 2:
            self.qualifying_rest_periods.append({
                'start': start_time,
                'end': end_time,
                'duration': duration,
                'type': 'rest_2_plus'
            })
            
        # Sort periods by start time
        self.qualifying_rest_periods.sort(key=lambda x: x['start'])
        
        # Find pairs and update calculation periods
        self._update_calculation_periods()
        
    def _update_calculation_periods(self):
        """
        Updates calculation periods based on qualifying rest periods
        Looks for valid pairs according to the sleeper berth provision
        """
        self.calculation_periods = []
        
        # We need at least 2 qualifying periods to form a pair
        if len(self.qualifying_rest_periods) < 2:
            return
            
        # Check each potential pair of rest periods
        for i in range(len(self.qualifying_rest_periods) - 1):
            period1 = self.qualifying_rest_periods[i]
            
            for j in range(i + 1, len(self.qualifying_rest_periods)):
                period2 = self.qualifying_rest_periods[j]
                
                # Check if they form a valid pair according to sleeper berth provision
                # One period must be at least 7 hours in sleeper berth
                # Combined periods must total at least 10 hours
                if (period1['type'] == 'sleeper_7_plus' or period2['type'] == 'sleeper_7_plus') and \
                   (period1['duration'] + period2['duration'] >= 10):
                    
                    # Create a calculation period
                    calc_period = {
                        'first_break': period1,
                        'second_break': period2,
                        'calculation_start': period1['end'],
                        'calculation_end': period2['start']
                    }
                    
                    self.calculation_periods.append(calc_period)
        
    def get_latest_calculation_period(self):
        """Returns the most recent calculation period or None if no valid pairs exist"""
        if self.calculation_periods:
            return self.calculation_periods[-1]
        return None
    
    def does_driver_need_reset(self, current_time, driving_hours, duty_window_hours):
        """
        Determines if a driver needs a reset based on the calculation periods and current hour status
        
        Parameters:
        current_time (datetime): Current time
        driving_hours (float): Cumulative driving hours since last reset
        duty_window_hours (float): Hours since start of duty window
        
        Returns:
        bool: True if driver needs a full 10-hour reset, False otherwise
        """
        # Get the latest calculation period
        calc_period = self.get_latest_calculation_period()
        
        # If no valid calculation period exists, use standard rules
        if calc_period is None:
            return driving_hours >= 11 or duty_window_hours >= 14
            
        # If we have a valid calculation period, we need to check if we're over the limits
        # for the time since the end of the first rest period to the start of the second
        return driving_hours >= 11 or duty_window_hours >= 14
