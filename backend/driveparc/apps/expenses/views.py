# apps/expenses/views.py
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Expense
from .serializers import ExpenseSerializer
from .filters import ExpenseFilter

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related(
        'vehicle', 'approved_by', 'maintenance'
    ).all()
    serializer_class   = ExpenseSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = ExpenseFilter          # ← filterset_class, pas filterset_fields
    search_fields      = [
        'title', 'description', 'supplier_name',
        'reference_number', 'vehicle__registration_number',
        'vehicle__make', 'vehicle__model'
    ]
    ordering_fields    = ['expense_date', 'amount', 'expense_type', 'is_paid']
    ordering           = ['-expense_date']