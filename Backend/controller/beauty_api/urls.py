from django.urls import path

from .admin_crm_views import CrmSuspendView
from .admin_portal_views import (
    AdminAccountExportView,
    AdminAccountNoteView,
    AdminCustomerMessageView,
    AdminInviteConsumeView,
    AdminProviderMessageView,
    AdminTagAssignView,
    AdminTagCreateView,
    AdminTeamInviteView,
    AdminTeamRevokeView,
    AdminTeamRoleView,
    AdminTicketAssignView,
    AdminTicketCreateView,
    AdminTicketStatusView,
)
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
from .chat_views import (
    BusinessChatListView,
    ChatSendView,
    ChatThreadView,
    CustomerChatListView,
    WsTicketView,
)
from .business_views import (
    BusinessAccountContactView,
    BusinessAccountDeleteView,
    BusinessAccountPasswordView,
    BusinessApplicationSubmitView,
    BusinessApplicationView,
    BusinessAvailabilityView,
    BusinessBookingsView,
    BusinessCalendarStatsView,
    BusinessDashboardView,
    BusinessEarningsView,
    BusinessServiceDetailView,
    BusinessServiceListView,
)
from .favorite_views import FavoriteListView, ServiceFavoriteView
from .review_views import (
    BusinessReviewReplyView,
    BusinessReviewsListView,
    ReviewMineView,
    ServiceReviewCreateView,
    ServiceReviewsListView,
)
from .search_views import ServiceSearchView
from .views import (
    BusinessLoginView,
    BusinessLogoutView,
    BusinessProviderSignUpView,
    ForgotPasswordView,
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
    path('auth/forgot/', ForgotPasswordView.as_view(), name='beauty-auth-forgot'),
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
    path('admin/crm/suspend/', CrmSuspendView.as_view(), name='beauty-admin-crm-suspend'),
    path('admin/portal/tags/', AdminTagCreateView.as_view(), name='beauty-admin-portal-tag-create'),
    path('admin/portal/tags/<str:slug>/assign/', AdminTagAssignView.as_view(), name='beauty-admin-portal-tag-assign'),
    path('admin/portal/<str:target_type>/<int:target_id>/note/',  AdminAccountNoteView.as_view(),   name='beauty-admin-portal-note'),
    path('admin/portal/customer/<int:customer_id>/message/',      AdminCustomerMessageView.as_view(), name='beauty-admin-portal-customer-msg'),
    path('admin/portal/business/<int:provider_id>/message/',      AdminProviderMessageView.as_view(), name='beauty-admin-portal-business-msg'),
    path('admin/portal/<str:target_type>/<int:target_id>/export/', AdminAccountExportView.as_view(), name='beauty-admin-portal-export'),
    path('admin/portal/tickets/',                       AdminTicketCreateView.as_view(),   name='beauty-admin-portal-ticket-create'),
    path('admin/portal/tickets/<int:ticket_id>/assign/', AdminTicketAssignView.as_view(),   name='beauty-admin-portal-ticket-assign'),
    path('admin/portal/tickets/<int:ticket_id>/status/', AdminTicketStatusView.as_view(),   name='beauty-admin-portal-ticket-status'),
    path('admin/portal/team/invite/',                       AdminTeamInviteView.as_view(),     name='beauty-admin-portal-team-invite'),
    path('admin/portal/team/invite/<str:token>/',           AdminInviteConsumeView.as_view(),  name='beauty-admin-portal-team-invite-consume'),
    path('admin/portal/team/<int:principal_id>/role/',      AdminTeamRoleView.as_view(),       name='beauty-admin-portal-team-role'),
    path('admin/portal/team/<int:principal_id>/',           AdminTeamRevokeView.as_view(),     name='beauty-admin-portal-team-revoke'),

    # Customer marketplace (read-only, public)
    path('categories/<str:category>/', CategoryListView.as_view(), name='beauty-category'),
    path('providers/<int:provider_id>/', ProviderDetailView.as_view(), name='beauty-provider-detail'),
    path('services/search/', ServiceSearchView.as_view(), name='beauty-service-search'),
    path('services/<int:service_id>/', ServiceDetailView.as_view(), name='beauty-service-detail'),
    path('services/<int:service_id>/reviews/', ServiceReviewsListView.as_view(), name='beauty-service-reviews'),
    path('protected/services/<int:service_id>/reviews/', ServiceReviewCreateView.as_view(), name='beauty-service-review-create'),
    path('protected/reviews/<int:review_id>/', ReviewMineView.as_view(), name='beauty-review-mine'),
    path('protected/business/reviews/', BusinessReviewsListView.as_view(), name='beauty-business-reviews-list'),
    path('protected/business/reviews/<int:review_id>/reply/', BusinessReviewReplyView.as_view(), name='beauty-business-review-reply'),

    # Favorites (customer)
    path('protected/favorites/', FavoriteListView.as_view(), name='beauty-favorites-list'),
    path('protected/services/<int:service_id>/favorite/', ServiceFavoriteView.as_view(), name='beauty-service-favorite'),

    # Bookings (customer auth required — sits behind BeautyAuthMiddleware)
    path('protected/bookings/', MyBookingsView.as_view(), name='beauty-bookings'),
    path('protected/bookings/<int:booking_id>/cancel/', CancelBookingView.as_view(), name='beauty-booking-cancel'),
    path('protected/bookings/<int:booking_id>/cancel-grace/', CancelBookingGraceView.as_view(), name='beauty-booking-cancel-grace'),
    path('protected/bookings/<int:booking_id>/reschedule/', RescheduleBookingView.as_view(), name='beauty-booking-reschedule'),

    # Per-booking chat (customer + business; both auth gates handled in views).
    path('protected/chat/ws-ticket/', WsTicketView.as_view(), name='beauty-chat-ws-ticket'),
    path('protected/bookings/<int:booking_id>/chat/', ChatThreadView.as_view(), name='beauty-chat-thread'),
    path('protected/bookings/<int:booking_id>/chat/send/', ChatSendView.as_view(), name='beauty-chat-send'),
    path('protected/chats/', CustomerChatListView.as_view(), name='beauty-chats'),
    path('protected/business/chats/', BusinessChatListView.as_view(), name='beauty-business-chats'),

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
    path('protected/business/earnings/', BusinessEarningsView.as_view(), name='beauty-business-earnings'),
    path('protected/business/account/password/', BusinessAccountPasswordView.as_view(), name='beauty-business-account-password'),
    path('protected/business/account/contact/', BusinessAccountContactView.as_view(), name='beauty-business-account-contact'),
    path('protected/business/account/delete/', BusinessAccountDeleteView.as_view(), name='beauty-business-account-delete'),
]
