from django.urls import path

from .admin_views import FlagToggleView
from .booking_views import (
    CancelBookingGraceView,
    CancelBookingView,
    CategoryListView,
    MyBookingsView,
    ProviderDetailView,
    RescheduleBookingView,
    ServiceDetailView,
)
from .business_views import (
    BusinessApplicationSubmitView,
    BusinessApplicationView,
    BusinessAvailabilityView,
    BusinessBookingsView,
    BusinessCalendarStatsView,
    BusinessDashboardView,
    BusinessServiceDetailView,
    BusinessServiceListView,
)
from .views import (
    BusinessLoginView,
    BusinessLogoutView,
    BusinessProviderSignUpView,
    LoginView,
    LogoutView,
    MeView,
    SessionRefreshView,
    SignUpView,
)

urlpatterns = [
    path('signup/', SignUpView.as_view(), name='beauty-signup'),
    path('login/', LoginView.as_view(), name='beauty-login'),
    path('logout/', LogoutView.as_view(), name='beauty-logout'),
    path('business/signup/', BusinessProviderSignUpView.as_view(), name='beauty-business-signup'),
    path('business/login/', BusinessLoginView.as_view(), name='beauty-business-login'),
    path('business/logout/', BusinessLogoutView.as_view(), name='beauty-business-logout'),
    path('protected/me/', MeView.as_view(), name='beauty-me'),
    # Customer-only session rotation. Lives outside `/protected/` so the
    # endpoint can read the existing cookie itself and decide whether to
    # rotate it — putting it under `/protected/` would short-circuit on
    # an expired-but-recoverable session at the middleware.
    path('session/refresh/', SessionRefreshView.as_view(), name='beauty-session-refresh'),
    path('admin/flags/toggle/', FlagToggleView.as_view(), name='beauty-admin-flag-toggle'),

    # Customer marketplace (read-only, public)
    path('categories/<str:category>/', CategoryListView.as_view(), name='beauty-category'),
    path('providers/<int:provider_id>/', ProviderDetailView.as_view(), name='beauty-provider-detail'),
    path('services/<int:service_id>/', ServiceDetailView.as_view(), name='beauty-service-detail'),

    # Bookings (customer auth required — sits behind BeautyAuthMiddleware)
    path('protected/bookings/', MyBookingsView.as_view(), name='beauty-bookings'),
    path('protected/bookings/<int:booking_id>/cancel/', CancelBookingView.as_view(), name='beauty-booking-cancel'),
    path('protected/bookings/<int:booking_id>/cancel-grace/', CancelBookingGraceView.as_view(), name='beauty-booking-cancel-grace'),
    path('protected/bookings/<int:booking_id>/reschedule/', RescheduleBookingView.as_view(), name='beauty-booking-reschedule'),

    # Business portal (business auth required — same middleware enforces session,
    # the views additionally check user_type == 'business').
    path('protected/business/application/', BusinessApplicationView.as_view(), name='beauty-business-application'),
    path('protected/business/application/submit/', BusinessApplicationSubmitView.as_view(), name='beauty-business-application-submit'),
    path('protected/business/calendar/', BusinessCalendarStatsView.as_view(), name='beauty-business-calendar'),
    path('protected/business/dashboard/', BusinessDashboardView.as_view(), name='beauty-business-dashboard'),
    path('protected/business/services/', BusinessServiceListView.as_view(), name='beauty-business-services'),
    path('protected/business/services/<int:service_id>/', BusinessServiceDetailView.as_view(), name='beauty-business-service-detail'),
    path('protected/business/availability/', BusinessAvailabilityView.as_view(), name='beauty-business-availability'),
    path('protected/business/bookings/', BusinessBookingsView.as_view(), name='beauty-business-bookings'),
]
