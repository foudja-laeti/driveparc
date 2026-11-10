# apps/expenses/serializers.py

from rest_framework import serializers
from .models import Expense
from apps.vehicles.models import Vehicle   


class VehicleMinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'make', 'model', 'registration_number', 'year', 'assignment_type']


class ExpenseSerializer(serializers.ModelSerializer):
    vehicle_info = VehicleMinSerializer(source='vehicle', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']