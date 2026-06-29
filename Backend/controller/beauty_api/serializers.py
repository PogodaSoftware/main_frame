from rest_framework import serializers
from .models import BeautyUser, BusinessProvider


# Generic message used for any cross-role / duplicate-email signup
# rejection. Identical wording across both portals so the response
# cannot be used to enumerate which role an email already belongs to.
DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists.'


class DeviceIdField(serializers.CharField):
    """Required device-id string: trimmed, non-blank.

    Shared by every serializer that binds a session to a device (login and
    signup, customer and business) so the validation lives in one place
    instead of a copy-pasted ``validate_device_id`` on each serializer.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault('max_length', 255)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data).strip()
        if not value:
            raise serializers.ValidationError('Device ID is required.')
        return value


class SignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    device_id = DeviceIdField()

    def validate_email(self, value):
        value = value.lower().strip()
        # Globally unique email: reject if the address exists in either
        # the customer (BeautyUser) or business (BusinessProvider) table.
        if (
            BeautyUser.objects.filter(email=value).exists()
            or BusinessProvider.objects.filter(email=value).exists()
        ):
            raise serializers.ValidationError(DUPLICATE_EMAIL_MESSAGE)
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters.')
        return value

    def create(self, validated_data):
        user = BeautyUser(email=validated_data['email'])
        user.set_password(validated_data['password'])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    device_id = DeviceIdField()

    def validate_email(self, value):
        return value.lower().strip()


class BusinessProviderSignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    business_name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        value = value.lower().strip()
        if (
            BusinessProvider.objects.filter(email=value).exists()
            or BeautyUser.objects.filter(email=value).exists()
        ):
            raise serializers.ValidationError(DUPLICATE_EMAIL_MESSAGE)
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters.')
        return value

    def validate_business_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Business name is required.')
        return value

    def create(self, validated_data):
        provider = BusinessProvider(
            email=validated_data['email'],
            business_name=validated_data['business_name'],
        )
        provider.set_password(validated_data['password'])
        provider.save()
        return provider


class BusinessLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    device_id = DeviceIdField()

    def validate_email(self, value):
        return value.lower().strip()
