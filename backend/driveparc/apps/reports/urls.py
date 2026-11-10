# ─── apps/reports/urls.py ────────────────────────────────────────────────────
from django.urls import path
from .views import (
    FleetSummaryView,
    ExpenseReportView,
    MaintenanceReportView,
    ReservationReportView,
    ExecutiveSummaryView,
)

app_name = "reports"

urlpatterns = [
    # Parc automobile (pas de filtre date)
    path("fleet-summary/",         FleetSummaryView.as_view(),       name="fleet-summary"),

    # Reports filtrables par date_from / date_to
    path("expense-report/",        ExpenseReportView.as_view(),      name="expense-report"),
    path("maintenance-report/",    MaintenanceReportView.as_view(),  name="maintenance-report"),
    path("reservation-report/",    ReservationReportView.as_view(),  name="reservation-report"),

    # Synthèse exécutive (agrège tous les reports)
    path("executive-summary/",     ExecutiveSummaryView.as_view(),   name="executive-summary"),
]