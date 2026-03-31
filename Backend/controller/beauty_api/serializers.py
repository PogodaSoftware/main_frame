import re
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import BeautyUser


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
