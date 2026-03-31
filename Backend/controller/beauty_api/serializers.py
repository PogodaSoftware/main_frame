from rest_framework import serializers
from .models import BeautyUser, BusinessProvider


class SignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value):
        value = value.lower().strip()
        if BeautyUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
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
    device_id = serializers.CharField(max_length=255)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_device_id(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Device ID is required.')
        return value


class BusinessProviderSignUpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    business_name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        value = value.lower().strip()
        if BusinessProvider.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
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
    device_id = serializers.CharField(max_length=255)

    def validate_email(self, value):
        return value.lower().strip()

    def validate_device_id(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Device ID is required.')
        return value
