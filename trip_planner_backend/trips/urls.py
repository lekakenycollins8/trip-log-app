from django.urls import path, include
from rest_framework import routers
from .views import TripViewSet, StopViewSet, LogEntryViewSet, RouteViewSet

router = routers.DefaultRouter()
router.register(r'trips', TripViewSet)
router.register(r'stops', StopViewSet)
router.register(r'log-entries', LogEntryViewSet)
router.register(r'routes', RouteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]