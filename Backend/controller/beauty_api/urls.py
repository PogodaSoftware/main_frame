from django.urls import path

from .views import (
    BusinessLoginView,
    BusinessLogoutView,
    BusinessProviderSignUpView,
    LoginView,
    LogoutView,
    MeView,
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
]
