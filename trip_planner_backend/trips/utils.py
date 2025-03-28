from math import radians, sin, cos, sqrt, atan2

def calculate_distance(coord1, coord2):
    """
    Calculate the distance between two coordinates using the Haversine formula.
    :param coord1: Tuple of (latitude, longitude) for the first coordinate.
    :param coord2: Tuple of (latitude, longitude) for the second coordinate.
    :return: Distance in kilometers.
    """
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    # Convert latitude and longitude to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    # Radius of earth in kilometers. Use 3959 for miles
    radius = 6371

    # Calculate the result
    distance = radius * c
    return distance