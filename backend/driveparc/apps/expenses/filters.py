# apps/expenses/filters.py
import django_filters
from .models import Expense

class ExpenseFilter(django_filters.FilterSet):
    expense_date_after  = django_filters.DateFilter(field_name='expense_date', lookup_expr='gte')
    expense_date_before = django_filters.DateFilter(field_name='expense_date', lookup_expr='lte')
    amount_min          = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount_max          = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    vehicle             = django_filters.NumberFilter(field_name='vehicle__id')

    class Meta:
        model   = Expense
        fields  = ['expense_type', 'is_paid', 'payment_method', 'vehicle']