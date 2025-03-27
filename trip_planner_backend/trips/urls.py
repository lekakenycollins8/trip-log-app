from django.urls import path, include
from rest_framework import routers
from .views import TripViewSet, StopViewSet, LogEntryViewSet, RouteViewSet

router = routers.DefaultRouter()
router.register(r'trips', TripViewSet, 'trip')
router.register(r'stops', StopViewSet, 'stop')
router.register(r'log-entries', LogEntryViewSet, 'log-entry')
router.register(r'routes', RouteViewSet, 'route')

urlpatterns = [
    path('', include(router.urls)),
]