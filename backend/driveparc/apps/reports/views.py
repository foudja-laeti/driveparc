# ─── apps/reports/views.py ───────────────────────────────────────────────────
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from datetime import date, datetime

from .services import (
    get_fleet_summary,
    get_expense_report,
    get_maintenance_report,
    get_reservation_report,
    get_executive_summary,
)


def _parse_dates(request):
    """
    Lit date_from / date_to depuis les query params.
    Accepte YYYY-MM-DD. Retourne (date|None, date|None).
    """
    def _parse(val):
        if not val:
            return None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
        raise ValidationError(
            {"detail": f"Format de date invalide : « {val} ». Utilisez YYYY-MM-DD."}
        )

    date_from = _parse(request.query_params.get("date_from"))
    date_to   = _parse(request.query_params.get("date_to"))

    # Cohérence
    if date_from and date_to and date_from > date_to:
        raise ValidationError(
            {"detail": "date_from ne peut pas être postérieure à date_to."}
        )

    return date_from, date_to


class FleetSummaryView(APIView):
    """
    GET /api/v1/reports/fleet-summary/
    Synthèse du parc automobile (pas de filtre date — données instantanées).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = get_fleet_summary()
        return Response(data)


class ExpenseReportView(APIView):
    """
    GET /api/v1/reports/expense-report/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Rapport financier / dépenses ventilé par type, véhicule, mois.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from, date_to = _parse_dates(request)
        data = get_expense_report(date_from=date_from, date_to=date_to)
        return Response(data)


class MaintenanceReportView(APIView):
    """
    GET /api/v1/reports/maintenance-report/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Rapport maintenance préventive/corrective + signalements terrain.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from, date_to = _parse_dates(request)
        data = get_maintenance_report(date_from=date_from, date_to=date_to)
        return Response(data)


class ReservationReportView(APIView):
    """
    GET /api/v1/reports/reservation-report/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Rapport réservations, utilisation, destinations, taux d'occupation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from, date_to = _parse_dates(request)
        data = get_reservation_report(date_from=date_from, date_to=date_to)
        return Response(data)


class ExecutiveSummaryView(APIView):
    """
    GET /api/v1/reports/executive-summary/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Synthèse exécutive multi-module : score de santé, alertes, KPIs consolidés.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from, date_to = _parse_dates(request)
        data = get_executive_summary(date_from=date_from, date_to=date_to)
        return Response(data)